from fastapi import FastAPI, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from typing import Annotated, Optional, List
import models
import schemas
import crud
from database import engine, get_db
from rabbitmq_publisher import publish_event
from rabbitmq_consumer import start_consumer
import auth_client
import logging
import threading

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Reporting Service")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Start RabbitMQ consumer in background thread
consumer_thread = threading.Thread(target=start_consumer, daemon=True)
consumer_thread.start()


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "reporting"}


@app.get("/categories", response_model=List[schemas.Category])
def get_categories(db: Session = Depends(get_db)):
    """Get all report categories"""
    return crud.get_categories(db=db)


@app.get("/statuses", response_model=List[schemas.ReportStatus])
def get_statuses(db: Session = Depends(get_db)):
    """Get all report statuses"""
    return crud.get_statuses(db=db)


@app.get("/severities", response_model=List[schemas.Severity])
def get_severities(category_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Get all severities, optionally filtered by category"""
    return crud.get_severities(db=db, category_id=category_id)


async def get_current_user_id(authorization: Annotated[str, Header()]):
    """Verify token with auth service and get user_id"""
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header"
        )
    token = authorization.replace("Bearer ", "")
    user = await auth_client.verify_token(token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    return user["id"]


@app.post("/", response_model=schemas.Report)
async def create_report(
    report: schemas.ReportCreate,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    # Create report
    db_report = crud.create_report(db=db, report=report, user_id=user_id)
    
    # Publish ReportCreated event
    try:
        publish_event("report.created", {
            "report_id": db_report.id,
            "user_id": db_report.user_id,
            "location": {
                "latitude": float(db_report.latitude),
                "longitude": float(db_report.longitude)
            },
            "category_id": db_report.category_id
        })
        logger.info(f"Published ReportCreated event for report {db_report.id}")
    except Exception as e:
        logger.error(f"Failed to publish ReportCreated event: {e}")
    
    return db_report


@app.get("/", response_model=List[schemas.Report])
async def get_reports(
    skip: int = 0,
    limit: int = 100,
    status_filter: Optional[str] = None,
    category: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    radius_km: Optional[float] = None,
    db: Session = Depends(get_db)
):
    """Get reports with optional filters including geo-location"""
    reports = crud.get_reports(
        db=db,
        skip=skip,
        limit=limit,
        status=status_filter,
        category=category,
        latitude=latitude,
        longitude=longitude,
        radius_km=radius_km
    )
    return reports


@app.get("/my-reports", response_model=List[schemas.Report])
async def get_my_reports(
    skip: int = 0,
    limit: int = 100,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Get current user's reports"""
    reports = crud.get_user_reports(db=db, user_id=user_id, skip=skip, limit=limit)
    return reports


@app.get("/{report_id}", response_model=schemas.Report)
async def get_report(
    report_id: int,
    db: Session = Depends(get_db)
):
    report = crud.get_report(db=db, report_id=report_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )
    return report


@app.patch("/{report_id}/status", response_model=schemas.Report)
async def update_report_status(
    report_id: int,
    status_update: schemas.ReportStatusUpdate,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Update report status and create status history entry"""
    report = crud.update_report_status(
        db=db,
        report_id=report_id,
        new_status=status_update.status_id,
        comment=status_update.comment,
        updated_by=user_id
    )
    
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )
    
    # Publish ReportStatusUpdated event
    try:
        publish_event("report.status_updated", {
            "report_id": report.id,
            "new_status_id": status_update.status_id,
            "updated_by": user_id
        })
    except Exception as e:
        logger.error(f"Failed to publish ReportStatusUpdated event: {e}")
    
    return report


@app.get("/{report_id}/history", response_model=List[schemas.ReportStatusHistory])
async def get_report_history(
    report_id: int,
    db: Session = Depends(get_db)
):
    """Get status change history for a report"""
    history = crud.get_report_history(db=db, report_id=report_id)
    return history
