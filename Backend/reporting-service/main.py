import logging
import os
import shutil
import threading
import uuid
from typing import Annotated, List, Optional

import auth_client
import crud
import models
import schemas
from database import engine, get_db
from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from rabbitmq_consumer import start_consumer
from rabbitmq_publisher import publish_event
from sqlalchemy.orm import Session

models.Base.metadata.create_all(bind=engine)

# Create uploads directory if it doesn't exist
UPLOAD_DIR = "/app/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI(title="Reporting Service")

# Mount static files for serving uploaded images
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Start RabbitMQ consumer in background thread
consumer_thread = threading.Thread(target=start_consumer, daemon=True)
consumer_thread.start()


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


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "reporting"}


@app.post("/upload")
async def upload_image(
    file: UploadFile = File(...),
    user_id: int = Depends(get_current_user_id)
):
    """Upload an image file and return the URL"""
    # Validate file type
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type {file.content_type} not allowed. Use: jpeg, png, gif, webp"
        )
    
    # Validate file size (max 10MB)
    max_size = 10 * 1024 * 1024  # 10MB
    content = await file.read()
    if len(content) > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File too large. Maximum size is 10MB"
        )
    
    # Generate unique filename
    file_extension = os.path.splitext(file.filename)[1] if file.filename else ".jpg"
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    # Save file
    with open(file_path, "wb") as buffer:
        buffer.write(content)
    
    logger.info(f"File uploaded: {unique_filename} by user {user_id}")
    
    # Return the URL path (will be served via /uploads/)
    return {
        "filename": unique_filename,
        "url": f"/uploads/{unique_filename}",
        "size": len(content),
        "content_type": file.content_type
    }


@app.get("/categories", response_model=List[schemas.Category])
def get_categories(db: Session = Depends(get_db)):
    """Get all report categories"""
    return crud.get_categories(db=db)


@app.post("/categories", response_model=schemas.Category, status_code=status.HTTP_201_CREATED)
async def create_category(
    category: schemas.CategoryCreate,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Create a new report category (admin only)"""
    return crud.create_category(db=db, category=category)


@app.patch("/categories/{category_id}", response_model=schemas.Category)
async def update_category(
    category_id: int,
    category: schemas.CategoryUpdate,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Update a report category (admin only)"""
    db_category = crud.update_category(db=db, category_id=category_id, category=category)
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")
    return db_category


@app.delete("/categories/{category_id}")
async def delete_category(
    category_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Delete a report category (admin only)"""
    db_category = crud.delete_category(db=db, category_id=category_id)
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category deleted successfully"}


@app.get("/statuses", response_model=List[schemas.ReportStatus])
def get_statuses(db: Session = Depends(get_db)):
    """Get all report statuses"""
    return crud.get_statuses(db=db)


@app.get("/severities", response_model=List[schemas.Severity])
def get_severities(category_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Get all severities, optionally filtered by category"""
    return crud.get_severities(db=db, category_id=category_id)


@app.post("/", response_model=schemas.Report)
async def create_report(
    report: schemas.ReportCreate,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    # Create report - may also confirm a matching pending report
    db_report, confirmed_report = crud.create_report(db=db, report=report, user_id=user_id)
    
    # Publish ReportCreated event (without awarding points - points come on confirmation)
    try:
        publish_event("report.created", {
            "report_id": db_report.id,
            "user_id": db_report.user_id,
            "location": {
                "latitude": float(db_report.latitude),
                "longitude": float(db_report.longitude)
            },
            "category_id": db_report.category_id,
            "confirmation_status": db_report.confirmation_status,
            "award_points": False  # Don't award points on creation
        })
        logger.info(f"Published ReportCreated event for report {db_report.id} (status: {db_report.confirmation_status})")
    except Exception as e:
        logger.error(f"Failed to publish ReportCreated event: {e}")
    
    # If a matching report was confirmed, award points to both users
    if confirmed_report:
        try:
            # Award points to original reporter
            publish_event("report.confirmed", {
                "report_id": confirmed_report.id,
                "original_user_id": confirmed_report.user_id,
                "confirming_user_id": user_id,
                "confirmation_type": "similar_report",
                "award_points": True
            })
            logger.info(f"Published ReportConfirmed event for report {confirmed_report.id}")
            
            # Also award points to the new reporter (their report is also confirmed)
            publish_event("report.confirmed", {
                "report_id": db_report.id,
                "original_user_id": user_id,
                "confirming_user_id": confirmed_report.user_id,
                "confirmation_type": "auto_match",
                "award_points": True
            })
        except Exception as e:
            logger.error(f"Failed to publish ReportConfirmed event: {e}")
    
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
    include_pending: bool = False,
    include_deleted: bool = False,
    db: Session = Depends(get_db)
):
    """
    Get reports with optional filters including geo-location.
    By default, only confirmed reports are returned.
    Set include_pending=true to also see pending reports.
    Set include_deleted=true to see deleted reports only (trash).
    """
    reports = crud.get_reports(
        db=db,
        skip=skip,
        limit=limit,
        status=status_filter,
        category=category,
        latitude=latitude,
        longitude=longitude,
        radius_km=radius_km,
        include_pending=include_pending,
        include_deleted=include_deleted
    )
    
    # Enrich reports with user information
    enriched_reports = []
    user_cache = {}
    
    for report in reports:
        report_dict = {
            "id": report.id,
            "user_id": report.user_id,
            "title": report.title,
            "description": report.description,
            "category_id": report.category_id,
            "latitude": report.latitude,
            "longitude": report.longitude,
            "address_text": report.address_text,
            "severity_id": report.severity_id,
            "photo_urls": report.photo_urls,
            "status_id": report.status_id,
            "user_hide": report.user_hide,
            "confirmation_status": report.confirmation_status,
            "confirmed_by_user_id": report.confirmed_by_user_id,
            "confirmed_at": report.confirmed_at,
            "points_awarded": report.points_awarded,
            "created_at": report.created_at,
            "updated_at": report.updated_at,
            "user_name": None,
            "user_phone": None,
            "user_email": None,
        }
        
        # Get user info from cache or auth service
        user_id = report.user_id
        if user_id in user_cache:
            user_info = user_cache[user_id]
        else:
            try:
                user_info = auth_client.get_user_by_id(user_id)
                user_cache[user_id] = user_info
            except Exception as e:
                logger.warning(f"Failed to get user info for user {user_id}: {e}")
                user_info = None
        
        if user_info:
            report_dict["user_name"] = user_info.get("full_name")
            report_dict["user_phone"] = user_info.get("phone")
            report_dict["user_email"] = user_info.get("email")
        
        enriched_reports.append(report_dict)
    
    return enriched_reports


@app.get("/pending-nearby", response_model=List[schemas.Report])
async def get_pending_reports_nearby(
    latitude: float,
    longitude: float,
    radius_km: float = 5.0,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Get pending reports near the user's location that they can confirm.
    Excludes the user's own reports.
    """
    reports = crud.get_pending_reports_nearby(
        db=db,
        latitude=latitude,
        longitude=longitude,
        radius_km=radius_km,
        exclude_user_id=user_id
    )
    return reports


@app.post("/{report_id}/confirm", response_model=schemas.ConfirmReportResponse)
async def confirm_report(
    report_id: int,
    confirm_request: schemas.ConfirmReportRequest,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Confirm that a report still exists ('Still There' button).
    Awards points to both the original reporter and confirmer.
    """
    success, message, points_awarded = crud.confirm_report_still_there(
        db=db,
        report_id=report_id,
        user_id=user_id,
        latitude=float(confirm_request.latitude) if confirm_request.latitude else None,
        longitude=float(confirm_request.longitude) if confirm_request.longitude else None
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    # Publish confirmation event to award points
    if points_awarded > 0:
        try:
            report = crud.get_report(db, report_id)
            publish_event("report.confirmed", {
                "report_id": report_id,
                "original_user_id": report.user_id,
                "confirming_user_id": user_id,
                "confirmation_type": "still_there",
                "award_points": True
            })
            logger.info(f"Published ReportConfirmed event for report {report_id}")
        except Exception as e:
            logger.error(f"Failed to publish ReportConfirmed event: {e}")
    
    return schemas.ConfirmReportResponse(
        success=True,
        message=message,
        report_confirmed=True,
        points_awarded=points_awarded
    )


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


@app.put("/{report_id}", response_model=schemas.Report)
async def update_report(
    report_id: int,
    report_update: schemas.ReportUpdate,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Update a report"""
    # Convert Pydantic model to dict, excluding None values
    update_data = report_update.model_dump(exclude_none=True)
    
    report = crud.update_report(
        db=db,
        report_id=report_id,
        report_update=update_data
    )
    
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
    """Get status change history for a report with user names"""
    history = crud.get_report_history(db=db, report_id=report_id)
    
    # Enrich history with user names from auth service
    enriched_history = []
    user_cache = {}  # Cache to avoid multiple API calls for the same user
    
    for entry in history:
        entry_dict = {
            "id": entry.id,
            "report_id": entry.report_id,
            "old_status_id": entry.old_status_id,
            "new_status_id": entry.new_status_id,
            "changed_by_user_id": entry.changed_by_user_id,
            "comment": entry.comment,
            "created_at": entry.created_at,
            "changed_by_user_name": None,
            "changed_by_user_email": None,
        }
        
        # Get user info from cache or auth service
        user_id = entry.changed_by_user_id
        if user_id in user_cache:
            user_info = user_cache[user_id]
        else:
            try:
                user_info = auth_client.get_user_by_id(user_id)
                user_cache[user_id] = user_info
            except Exception as e:
                logger.warning(f"Failed to get user info for user {user_id}: {e}")
                user_info = None
        
        if user_info:
            entry_dict["changed_by_user_name"] = user_info.get("full_name")
            entry_dict["changed_by_user_email"] = user_info.get("email")
        
        enriched_history.append(entry_dict)
    
    return enriched_history


@app.delete("/{report_id}")
async def delete_report(
    report_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Soft delete a report (mark as deleted)"""
    report = crud.soft_delete_report(db=db, report_id=report_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )
    
    logger.info(f"Report {report_id} soft deleted by user {user_id}")
    return {"message": "Report deleted successfully", "report_id": report_id}


@app.post("/{report_id}/restore")
async def restore_report(
    report_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Restore a soft-deleted report"""
    report = crud.restore_report(db=db, report_id=report_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )
    
    logger.info(f"Report {report_id} restored by user {user_id}")
    return {"message": "Report restored successfully", "report_id": report_id}


@app.get("/trash/all", response_model=List[schemas.Report])
async def get_deleted_reports(
    skip: int = 0,
    limit: int = 100,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Get all soft-deleted reports (trash)"""
    reports = crud.get_deleted_reports(db=db, skip=skip, limit=limit)
    return reports
