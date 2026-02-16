import logging
import os
import shutil
import threading
import uuid
from typing import Annotated, List, Optional

import ai_client
import auth_client
import crud
import models
import schemas
from database import engine, get_db
from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from json_logger import setup_logging
from logging_middleware import RequestLoggingMiddleware
from rabbitmq_consumer import start_consumer
from rabbitmq_publisher import publish_event
from sqlalchemy import text
from sqlalchemy.orm import Session

# Internal API key for service-to-service communication (DSGVO endpoints)
INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "kashif-internal-secret-2026")

models.Base.metadata.create_all(bind=engine)

# Create uploads directory if it doesn't exist
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "/app/uploads")
try:
    os.makedirs(UPLOAD_DIR, exist_ok=True)
except PermissionError:
    UPLOAD_DIR = os.path.join(os.getcwd(), "uploads")
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

# Structured JSON logging with request-ID tracing
app.add_middleware(RequestLoggingMiddleware)

logger = setup_logging("reporting")

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


async def get_current_user(authorization: Annotated[str, Header()]):
    """Verify token with auth service and get full user dict (id, role, etc.)"""
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
    return user


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "reporting"}


@app.get("/health/detailed")
def health_check_detailed():
    """Detailed health check - verifies DB and RabbitMQ connectivity."""
    import time
    checks = {}
    overall = "healthy"

    # Check database
    start = time.time()
    try:
        db = next(get_db())
        db.execute(text("SELECT 1"))
        checks["database"] = {"status": "healthy", "response_ms": round((time.time() - start) * 1000, 2)}
    except Exception as e:
        checks["database"] = {"status": "unhealthy", "error": str(e)}
        overall = "unhealthy"

    # Check RabbitMQ
    start = time.time()
    try:
        import pika
        rabbitmq_url = os.getenv("RABBITMQ_URL", "amqp://kashif:kashif123@rabbitmq:5672/")
        connection = pika.BlockingConnection(pika.URLParameters(rabbitmq_url))
        connection.close()
        checks["rabbitmq"] = {"status": "healthy", "response_ms": round((time.time() - start) * 1000, 2)}
    except Exception as e:
        checks["rabbitmq"] = {"status": "unhealthy", "error": str(e)}
        overall = "degraded"

    status_code = 200 if overall == "healthy" else 503
    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=status_code,
        content={"status": overall, "service": "reporting", "checks": checks}
    )


@app.post("/upload")
async def upload_image(
    file: UploadFile = File(...),
    user_id: int = Depends(get_current_user_id)
):
    """Upload an image file, run AI analysis, and return URL with AI description"""
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
    
    # Run AI analysis on the uploaded image
    ai_result = None
    annotated_filename = None
    try:
        ai_result = await ai_client.analyze_image(file_path, UPLOAD_DIR)
        if ai_result and ai_result.get("success"):
            logger.info(f"AI detected {ai_result.get('num_potholes', 0)} potholes in {unique_filename}")
            
            # If AI returned annotated image, save it
            annotated_base64 = ai_result.get("annotated_image_base64")
            if annotated_base64:
                import base64
                annotated_filename = f"annotated_{unique_filename}"
                annotated_path = os.path.join(UPLOAD_DIR, annotated_filename)
                with open(annotated_path, "wb") as f:
                    f.write(base64.b64decode(annotated_base64))
                logger.info(f"Saved annotated image: {annotated_filename}")
    except Exception as e:
        logger.warning(f"AI analysis failed for {unique_filename}: {e}")
    
    # Build response with AI data
    response = {
        "filename": unique_filename,
        "url": f"/uploads/{unique_filename}",
        "size": len(content),
        "content_type": file.content_type
    }
    
    # Add AI analysis results if available
    if ai_result and ai_result.get("success"):
        response["ai_analysis"] = {
            "num_potholes": ai_result.get("num_potholes", 0),
            "max_severity": ai_result.get("max_severity"),
            "ai_description": ai_result.get("ai_description"),
            "ai_description_ar": ai_result.get("ai_description_ar"),
            "detections": ai_result.get("detections", [])
        }
        # Add annotated image URL if available
        if annotated_filename:
            response["ai_analysis"]["annotated_url"] = f"/uploads/{annotated_filename}"
    
    return response


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
    try:
        db_category = crud.delete_category(db=db, category_id=category_id)
        if not db_category:
            raise HTTPException(status_code=404, detail="Category not found")
        return {"message": "Category deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


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
    
    # Publish ReportCreated event - award points since report is confirmed on creation
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
            "award_points": True  # Award points for creating a report
        })
        logger.info(f"Published ReportCreated event for report {db_report.id} (status: {db_report.confirmation_status})")
    except Exception as e:
        logger.error(f"Failed to publish ReportCreated event: {e}")
    
    # If a matching report was confirmed, award extra points to the original reporter
    if confirmed_report:
        try:
            # Award bonus points to original reporter for confirmation
            publish_event("report.confirmed", {
                "report_id": confirmed_report.id,
                "original_user_id": confirmed_report.user_id,
                "confirming_user_id": user_id,
                "confirmation_type": "similar_report",
                "award_points": True
            })
            logger.info(f"Published ReportConfirmed event for report {confirmed_report.id}")
        except Exception as e:
            logger.error(f"Failed to publish ReportConfirmed event: {e}")
    
    return db_report


@app.post("/along-route", response_model=schemas.RouteReportsResponse)
async def get_reports_along_route(
    request: schemas.RouteReportsRequest,
    db: Session = Depends(get_db)
):
    """
    Find confirmed reports along a route defined by waypoints.
    Accepts a list of lat/lng waypoints and a buffer distance.
    Returns hazards sorted by position along the route.
    """
    waypoints = [{"latitude": w.latitude, "longitude": w.longitude} for w in request.waypoints]
    
    results = crud.get_reports_along_route(
        db=db,
        waypoints=waypoints,
        buffer_meters=request.buffer_meters
    )
    
    # Build response
    summary: dict = {}
    route_reports = []
    
    for report, distance, wp_idx in results:
        cat_id = report.category_id
        summary[cat_id] = summary.get(cat_id, 0) + 1
        route_reports.append(schemas.RouteReport(
            id=report.id,
            title=report.title,
            description=report.description,
            category_id=report.category_id,
            latitude=report.latitude,
            longitude=report.longitude,
            address_text=report.address_text,
            status_id=report.status_id,
            created_at=report.created_at,
            distance_from_route_meters=round(distance, 1),
            nearest_waypoint_index=wp_idx,
            photo_urls=report.photo_urls,
            confirmation_status=report.confirmation_status or "pending",
        ))
    
    return schemas.RouteReportsResponse(
        total_hazards=len(route_reports),
        reports=route_reports,
        summary=summary
    )


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
            "ai_annotated_url": report.ai_annotated_url,
            "ai_detections": report.ai_detections,
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


@app.get("/check-duplicates", response_model=schemas.DuplicateCheckResponse)
async def check_duplicates(
    latitude: float,
    longitude: float,
    category_id: int,
    radius_meters: float = 50.0,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Check for nearby duplicate reports before creating a new one.
    Returns reports within the specified radius (default 50m) with the same category.
    """
    # Cap radius to reasonable max (200m)
    radius = min(radius_meters, 200.0)

    duplicates = crud.find_nearby_duplicates(
        db=db,
        latitude=latitude,
        longitude=longitude,
        category_id=category_id,
        radius_meters=radius,
        exclude_user_id=user_id
    )

    nearby_reports = []
    for dup in duplicates:
        report = dup["report"]
        nearby_reports.append(schemas.NearbyDuplicate(
            id=report.id,
            title=report.title,
            description=report.description,
            category_id=report.category_id,
            latitude=report.latitude,
            longitude=report.longitude,
            address_text=report.address_text,
            confirmation_status=report.confirmation_status,
            confirmation_count=report.confirmation_count or 0,
            status_id=report.status_id,
            created_at=report.created_at,
            distance_meters=dup["distance_meters"],
            photo_urls=report.photo_urls
        ))

    has_duplicates = len(nearby_reports) > 0

    if has_duplicates:
        message = f"Found {len(nearby_reports)} similar report(s) within {int(radius)}m. Consider confirming an existing report instead."
    else:
        message = "No similar reports found nearby. You can create a new report."

    return schemas.DuplicateCheckResponse(
        has_duplicates=has_duplicates,
        count=len(nearby_reports),
        nearby_reports=nearby_reports,
        message=message
    )


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
            "user_id": report.user_id,
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


# ============================================================
# Bulk Operations — Admin endpoints
# ============================================================

@app.post("/bulk-status", response_model=schemas.BulkOperationResult)
async def bulk_update_status(
    bulk: schemas.BulkStatusUpdate,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Bulk update status of multiple reports"""
    success_count = 0
    failed_ids = []
    
    for report_id in bulk.report_ids:
        try:
            report = crud.update_report_status(
                db=db,
                report_id=report_id,
                new_status=bulk.status_id,
                comment=bulk.comment or f"Bulk status update",
                updated_by=user_id
            )
            if report:
                success_count += 1
                # Publish event
                try:
                    publish_event("report.status_updated", {
                        "report_id": report.id,
                        "user_id": report.user_id,
                        "new_status_id": bulk.status_id,
                        "updated_by": user_id
                    })
                except Exception:
                    pass
            else:
                failed_ids.append(report_id)
        except Exception:
            failed_ids.append(report_id)
    
    return schemas.BulkOperationResult(
        success_count=success_count,
        failed_count=len(failed_ids),
        failed_ids=failed_ids,
        message=f"Updated {success_count} of {len(bulk.report_ids)} reports"
    )


@app.post("/bulk-delete", response_model=schemas.BulkOperationResult)
async def bulk_delete_reports(
    bulk: schemas.BulkDeleteRequest,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Bulk soft-delete multiple reports"""
    success_count = 0
    failed_ids = []
    
    for report_id in bulk.report_ids:
        try:
            report = crud.soft_delete_report(db=db, report_id=report_id)
            if report:
                success_count += 1
                logger.info(f"Report {report_id} bulk-deleted by user {user_id}")
            else:
                failed_ids.append(report_id)
        except Exception:
            failed_ids.append(report_id)
    
    return schemas.BulkOperationResult(
        success_count=success_count,
        failed_count=len(failed_ids),
        failed_ids=failed_ids,
        message=f"Deleted {success_count} of {len(bulk.report_ids)} reports"
    )


@app.get("/export/csv")
async def export_reports_csv(
    status_filter: Optional[str] = None,
    category: Optional[str] = None,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Export reports as CSV"""
    import csv
    import io
    from fastapi.responses import StreamingResponse
    
    reports = crud.get_reports(
        db=db, skip=0, limit=10000,
        status=status_filter, category=category,
        include_pending=True
    )
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID", "Title", "Description", "Category ID", "Status ID",
        "Latitude", "Longitude", "Address", "Severity ID",
        "Confirmation Status", "Created At", "Updated At"
    ])
    
    for r in reports:
        writer.writerow([
            r.id, r.title, r.description, r.category_id, r.status_id,
            float(r.latitude) if r.latitude else "", float(r.longitude) if r.longitude else "",
            r.address_text or "", r.severity_id,
            r.confirmation_status, r.created_at, r.updated_at
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=reports_export.csv"}
    )


# ============================================================
# DSGVO / GDPR — Internal Endpoints (service-to-service only)
# ============================================================

def verify_internal_key(x_internal_key: str = Header(None)):
    """Verify internal API key for service-to-service calls"""
    if x_internal_key != INTERNAL_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid internal API key")


@app.delete("/internal/user-data/{user_id}")
def delete_user_data(
    user_id: int,
    db: Session = Depends(get_db),
    _: None = Depends(verify_internal_key)
):
    """DSGVO Art. 17 — Delete all data for a user (Right to Erasure)"""
    deleted = {"reports": 0, "confirmations": 0, "status_history": 0, "uploads_removed": []}

    # 1. Delete report confirmations by this user
    confirmations = db.query(models.ReportConfirmation).filter(
        models.ReportConfirmation.user_id == user_id
    ).all()
    deleted["confirmations"] = len(confirmations)
    for c in confirmations:
        db.delete(c)

    # 2. Anonymize confirmed_by_user_id on reports confirmed by this user
    db.query(models.Report).filter(
        models.Report.confirmed_by_user_id == user_id
    ).update({"confirmed_by_user_id": None})

    # 3. Anonymize status history entries by this user
    history_count = db.query(models.ReportStatusHistory).filter(
        models.ReportStatusHistory.changed_by_user_id == user_id
    ).update({"changed_by_user_id": 0})
    deleted["status_history"] = history_count

    # 4. Delete user's own reports and their uploaded images
    reports = db.query(models.Report).filter(
        models.Report.user_id == user_id
    ).all()
    deleted["reports"] = len(reports)

    for report in reports:
        # Delete associated status history
        db.query(models.ReportStatusHistory).filter(
            models.ReportStatusHistory.report_id == report.id
        ).delete()
        # Delete associated confirmations
        db.query(models.ReportConfirmation).filter(
            models.ReportConfirmation.report_id == report.id
        ).delete()
        # Delete uploaded images
        if report.photo_urls:
            for url in report.photo_urls.split(","):
                filename = url.strip().split("/")[-1]
                filepath = os.path.join(UPLOAD_DIR, filename)
                if os.path.exists(filepath):
                    os.remove(filepath)
                    deleted["uploads_removed"].append(filename)
        if report.ai_annotated_url:
            filename = report.ai_annotated_url.split("/")[-1]
            filepath = os.path.join(UPLOAD_DIR, filename)
            if os.path.exists(filepath):
                os.remove(filepath)
                deleted["uploads_removed"].append(filename)
        db.delete(report)

    db.commit()
    logger.info(f"DSGVO: Deleted all data for user {user_id}: {deleted}")
    return {"user_id": user_id, "deleted": deleted}


@app.get("/internal/user-data/{user_id}/export")
def export_user_data(
    user_id: int,
    db: Session = Depends(get_db),
    _: None = Depends(verify_internal_key)
):
    """DSGVO Art. 15/20 — Export all data for a user (Right of Access / Portability)"""
    # Reports
    reports = db.query(models.Report).filter(
        models.Report.user_id == user_id
    ).all()

    reports_data = []
    for r in reports:
        reports_data.append({
            "id": r.id,
            "title": r.title,
            "description": r.description,
            "latitude": float(r.latitude) if r.latitude else None,
            "longitude": float(r.longitude) if r.longitude else None,
            "address_text": r.address_text,
            "photo_urls": r.photo_urls,
            "category_id": r.category_id,
            "status_id": r.status_id,
            "severity_id": r.severity_id,
            "confirmation_status": r.confirmation_status,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })

    # Confirmations
    confirmations = db.query(models.ReportConfirmation).filter(
        models.ReportConfirmation.user_id == user_id
    ).all()

    confirmations_data = []
    for c in confirmations:
        confirmations_data.append({
            "id": c.id,
            "report_id": c.report_id,
            "confirmation_type": c.confirmation_type,
            "latitude": float(c.latitude) if c.latitude else None,
            "longitude": float(c.longitude) if c.longitude else None,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        })

    return {
        "service": "reporting",
        "user_id": user_id,
        "reports": reports_data,
        "confirmations": confirmations_data,
    }


# ════════════════════════════════════════════════════════
#  IN-APP FEEDBACK
# ════════════════════════════════════════════════════════

@app.post("/feedback", response_model=schemas.FeedbackResponse, status_code=201)
async def create_feedback(
    data: schemas.FeedbackCreate,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Submit user feedback (authenticated users)."""
    valid_categories = ["bug", "suggestion", "complaint", "other"]
    category = data.category if data.category in valid_categories else "other"

    fb = models.Feedback(
        user_id=user_id,
        subject=data.subject,
        message=data.message,
        category=category,
    )
    db.add(fb)
    db.commit()
    db.refresh(fb)
    logger.info(f"Feedback #{fb.id} created by user {user_id}")
    return fb


@app.get("/feedback/my", response_model=List[schemas.FeedbackResponse])
async def get_my_feedback(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Get all feedback submitted by current user."""
    items = (
        db.query(models.Feedback)
        .filter(models.Feedback.user_id == user_id)
        .order_by(models.Feedback.created_at.desc())
        .all()
    )
    return items


@app.get("/feedback", response_model=List[schemas.FeedbackResponse])
async def get_all_feedback(
    current_user: dict = Depends(get_current_user),
    status_filter: Optional[str] = None,
    category: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """Get all feedback (admin only)."""
    if current_user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin access required")

    query = db.query(models.Feedback)
    if status_filter:
        query = query.filter(models.Feedback.status == status_filter)
    if category:
        query = query.filter(models.Feedback.category == category)

    items = query.order_by(models.Feedback.created_at.desc()).offset(skip).limit(limit).all()
    return items


@app.put("/feedback/{feedback_id}", response_model=schemas.FeedbackResponse)
async def update_feedback(
    feedback_id: int,
    data: schemas.FeedbackUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update feedback status/notes (admin only)."""
    if current_user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin access required")

    fb = db.query(models.Feedback).filter(models.Feedback.id == feedback_id).first()
    if not fb:
        raise HTTPException(status_code=404, detail="Feedback not found")

    if data.status:
        valid_statuses = ["new", "in_progress", "resolved", "dismissed"]
        if data.status not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
        fb.status = data.status
    if data.admin_notes is not None:
        fb.admin_notes = data.admin_notes

    db.commit()
    db.refresh(fb)
    logger.info(f"Feedback #{feedback_id} updated by admin {current_user.get('id')}")
    return fb
