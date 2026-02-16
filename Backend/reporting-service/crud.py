from datetime import datetime, timedelta
from math import radians, sin, cos, sqrt, atan2
from typing import List, Optional, Tuple

import models
import schemas
from sqlalchemy import and_, func
from sqlalchemy.orm import Session

# Constants
CONFIRMATION_RADIUS_METERS = 500  # Reports within this radius can confirm each other
EARTH_RADIUS_KM = 6371.0


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the distance between two GPS coordinates using the Haversine formula.
    Returns distance in meters.
    """
    lat1_rad = radians(lat1)
    lat2_rad = radians(lat2)
    delta_lat = radians(lat2 - lat1)
    delta_lon = radians(lon2 - lon1)
    
    a = sin(delta_lat / 2) ** 2 + cos(lat1_rad) * cos(lat2_rad) * sin(delta_lon / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    
    distance_km = EARTH_RADIUS_KM * c
    return distance_km * 1000  # Convert to meters


def find_nearby_duplicates(
    db: Session,
    latitude: float,
    longitude: float,
    category_id: int,
    radius_meters: float = 50.0,
    exclude_user_id: Optional[int] = None
) -> List[dict]:
    """
    Find existing reports (any status) within the specified radius that match the category.
    Returns reports with distance info for duplicate detection.
    Default radius: 50 meters (per Features.md spec).
    """
    lat_range = radius_meters / 111000.0
    lon_range = radius_meters / (111000.0 * cos(radians(latitude)))

    query = db.query(models.Report).filter(
        and_(
            models.Report.deleted_at == None,
            models.Report.category_id == category_id,
            models.Report.latitude.between(latitude - lat_range, latitude + lat_range),
            models.Report.longitude.between(longitude - lon_range, longitude + lon_range)
        )
    )

    if exclude_user_id:
        query = query.filter(models.Report.user_id != exclude_user_id)

    candidates = query.order_by(models.Report.created_at.desc()).limit(10).all()

    results = []
    for report in candidates:
        distance = haversine_distance(
            latitude, longitude,
            float(report.latitude), float(report.longitude)
        )
        if distance <= radius_meters:
            results.append({
                "report": report,
                "distance_meters": round(distance, 1)
            })

    results.sort(key=lambda x: x["distance_meters"])
    return results


def find_matching_pending_reports(
    db: Session,
    latitude: float,
    longitude: float,
    category_id: int,
    exclude_user_id: int,
    radius_meters: float = CONFIRMATION_RADIUS_METERS
) -> List[models.Report]:
    """
    Find pending reports within the specified radius that match the category
    and were NOT created by the same user.
    """
    # First, get a rough bounding box to filter candidates (performance optimization)
    lat_range = radius_meters / 111000.0  # ~111km per degree latitude
    lon_range = radius_meters / (111000.0 * cos(radians(latitude)))
    
    candidates = db.query(models.Report).filter(
        and_(
            models.Report.confirmation_status == "pending",
            models.Report.category_id == category_id,
            models.Report.user_id != exclude_user_id,
            models.Report.latitude.between(latitude - lat_range, latitude + lat_range),
            models.Report.longitude.between(longitude - lon_range, longitude + lon_range)
        )
    ).all()
    
    # Filter by exact distance using Haversine
    matching_reports = []
    for report in candidates:
        distance = haversine_distance(
            latitude, longitude,
            float(report.latitude), float(report.longitude)
        )
        if distance <= radius_meters:
            matching_reports.append(report)
    
    return matching_reports


def create_report(db: Session, report: schemas.ReportCreate, user_id: int) -> Tuple[models.Report, Optional[models.Report]]:
    """
    Create a new report. Returns the new report and optionally a matched report that was confirmed.
    Reports start as 'pending' and are confirmed when another user submits a similar report nearby.
    """
    # Check for existing pending reports nearby with same category from different user
    matching_reports = find_matching_pending_reports(
        db=db,
        latitude=float(report.latitude),
        longitude=float(report.longitude),
        category_id=report.category_id,
        exclude_user_id=user_id
    )
    
    confirmed_report = None
    
    if matching_reports:
        # Found a matching pending report - confirm it!
        confirmed_report = matching_reports[0]  # Take the first match
        
        # Confirm the existing report
        confirmed_report.confirmation_status = "confirmed"
        confirmed_report.confirmed_by_user_id = user_id
        confirmed_report.confirmed_at = datetime.utcnow()
        
        # Create confirmation record
        confirmation = models.ReportConfirmation(
            report_id=confirmed_report.id,
            user_id=user_id,
            confirmation_type="similar_report",
            latitude=report.latitude,
            longitude=report.longitude,
            points_awarded=False
        )
        db.add(confirmation)
        
        # Create the new report as confirmed (since it confirms and is confirmed by the match)
        db_report = models.Report(
            user_id=user_id,
            title=report.title,
            description=report.description,
            category_id=report.category_id,
            status_id=1,  # Default to NEW status
            latitude=report.latitude,
            longitude=report.longitude,
            address_text=report.address_text,
            severity_id=report.severity_id,
            user_hide=False,
            photo_urls=report.photo_urls,
            confirmation_status="confirmed",
            confirmed_by_user_id=confirmed_report.user_id,
            confirmed_at=datetime.utcnow(),
            points_awarded=False
        )
    else:
        # No matching reports - create as confirmed (only 1 user needed)
        db_report = models.Report(
            user_id=user_id,
            title=report.title,
            description=report.description,
            category_id=report.category_id,
            status_id=1,  # Default to NEW status
            latitude=report.latitude,
            longitude=report.longitude,
            address_text=report.address_text,
            severity_id=report.severity_id,
            user_hide=False,
            photo_urls=report.photo_urls,
            confirmation_status="confirmed",
            points_awarded=False
        )
    
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    
    if confirmed_report:
        db.refresh(confirmed_report)
    
    return db_report, confirmed_report


def confirm_report_still_there(
    db: Session,
    report_id: int,
    user_id: int,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None
) -> Tuple[bool, str, int]:
    """
    Confirm that a report still exists ("Still There" button).
    Returns (success, message, points_awarded)
    """
    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    
    if not report:
        return False, "Report not found", 0
    
    # Cannot confirm your own report
    if report.user_id == user_id:
        return False, "You cannot confirm your own report", 0
    
    # Check if user already confirmed this report
    existing_confirmation = db.query(models.ReportConfirmation).filter(
        and_(
            models.ReportConfirmation.report_id == report_id,
            models.ReportConfirmation.user_id == user_id
        )
    ).first()
    
    if existing_confirmation:
        return False, "You have already confirmed this report", 0
    
    # Check distance if coordinates provided
    if latitude is not None and longitude is not None:
        distance = haversine_distance(
            latitude, longitude,
            float(report.latitude), float(report.longitude)
        )
        if distance > CONFIRMATION_RADIUS_METERS:
            return False, f"You are too far from the report location ({int(distance)}m away)", 0
    
    points_to_award = 0
    
    # Create confirmation record
    confirmation = models.ReportConfirmation(
        report_id=report_id,
        user_id=user_id,
        confirmation_type="still_there",
        latitude=latitude,
        longitude=longitude,
        points_awarded=False
    )
    db.add(confirmation)
    
    # If report was pending, confirm it now
    if report.confirmation_status == "pending":
        report.confirmation_status = "confirmed"
        report.confirmed_by_user_id = user_id
        report.confirmed_at = datetime.utcnow()
        report.confirmation_count = (report.confirmation_count or 0) + 1
        points_to_award = 20  # 10 for original reporter + 10 for confirmer
    else:
        # Report already confirmed, just award points to confirmer
        report.confirmation_count = (report.confirmation_count or 0) + 1
        points_to_award = 10
    
    db.commit()
    db.refresh(report)
    
    return True, "Report confirmed successfully", points_to_award


def get_report(db: Session, report_id: int):
    return db.query(models.Report).filter(models.Report.id == report_id).first()


def get_reports(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    category: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    radius_km: Optional[float] = None,
    include_pending: bool = False,
    user_id: Optional[int] = None,
    include_deleted: bool = False
) -> List[models.Report]:
    """
    Get reports with optional filters.
    By default, only confirmed reports are returned.
    Set include_pending=True to include pending reports.
    Set include_deleted=True to include soft-deleted reports.
    """
    query = db.query(models.Report)
    
    # Filter out deleted reports by default
    if not include_deleted:
        query = query.filter(models.Report.deleted_at == None)
    
    # By default, only show confirmed reports (unless include_pending is True)
    if not include_pending:
        query = query.filter(models.Report.confirmation_status == "confirmed")
    
    # Apply filters
    if status:
        query = query.filter(models.Report.status_id == status)
    
    if category:
        query = query.filter(models.Report.category_id == category)
    
    # Geo-location filter (simple distance calculation)
    if latitude is not None and longitude is not None and radius_km is not None:
        # Using Haversine formula approximation
        lat_range = radius_km / 111.0  # 1 degree latitude ≈ 111 km
        lon_range = radius_km / (111.0 * func.cos(func.radians(latitude)))
        
        query = query.filter(
            and_(
                models.Report.latitude.between(latitude - lat_range, latitude + lat_range),
                models.Report.longitude.between(longitude - lon_range, longitude + lon_range)
            )
        )
    
    return query.order_by(models.Report.created_at.desc()).offset(skip).limit(limit).all()


def get_user_reports(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    """Get user's reports - includes both pending and confirmed for the owner, excludes deleted"""
    return db.query(models.Report).filter(
        models.Report.user_id == user_id,
        models.Report.deleted_at == None
    ).order_by(models.Report.created_at.desc()).offset(skip).limit(limit).all()


def get_pending_reports_nearby(
    db: Session,
    latitude: float,
    longitude: float,
    radius_km: float = 5.0,
    exclude_user_id: Optional[int] = None
) -> List[models.Report]:
    """
    Get pending reports within radius for the 'Still There' feature.
    Users can see pending reports near them to confirm.
    """
    lat_range = radius_km / 111.0
    lon_range = radius_km / (111.0 * cos(radians(latitude)))
    
    query = db.query(models.Report).filter(
        and_(
            models.Report.confirmation_status == "pending",
            models.Report.latitude.between(latitude - lat_range, latitude + lat_range),
            models.Report.longitude.between(longitude - lon_range, longitude + lon_range)
        )
    )
    
    if exclude_user_id:
        query = query.filter(models.Report.user_id != exclude_user_id)
    
    # Filter by exact Haversine distance
    candidates = query.all()
    radius_meters = radius_km * 1000
    
    nearby_reports = []
    for report in candidates:
        distance = haversine_distance(
            latitude, longitude,
            float(report.latitude), float(report.longitude)
        )
        if distance <= radius_meters:
            nearby_reports.append(report)
    
    return nearby_reports


def update_report(
    db: Session,
    report_id: int,
    report_update: dict
):
    """Update a report with the given data"""
    report = get_report(db, report_id)
    if not report:
        return None
    
    # Update only provided fields
    for key, value in report_update.items():
        if value is not None and hasattr(report, key):
            setattr(report, key, value)
    
    db.commit()
    db.refresh(report)
    return report


def update_report_status(
    db: Session,
    report_id: int,
    new_status: str,
    comment: Optional[str],
    updated_by: int
):
    report = get_report(db, report_id)
    if not report:
        return None
    
    old_status_id = report.status_id
    
    # Update report status
    report.status_id = new_status
    
    # Create status history entry
    history = models.ReportStatusHistory(
        report_id=report_id,
        old_status_id=old_status_id,
        new_status_id=new_status,
        changed_by_user_id=updated_by,
        comment=comment
    )
    db.add(history)
    
    db.commit()
    db.refresh(report)
    return report


def get_report_history(db: Session, report_id: int):
    return db.query(models.ReportStatusHistory).filter(
        models.ReportStatusHistory.report_id == report_id
    ).order_by(models.ReportStatusHistory.created_at.desc()).all()


def get_categories(db: Session):
    """Get all categories"""
    return db.query(models.Category).order_by(models.Category.id).all()


def create_category(db: Session, category: "schemas.CategoryCreate"):
    """Create a new category"""
    db_category = models.Category(
        name=category.name,
        name_ar=category.name_ar,
        name_en=category.name_en,
        color=category.color,
        description=category.description
    )
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category


def update_category(db: Session, category_id: int, category: "schemas.CategoryUpdate"):
    """Update a category"""
    db_category = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not db_category:
        return None
    
    update_data = category.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_category, key, value)
    
    db.commit()
    db.refresh(db_category)
    return db_category


def delete_category(db: Session, category_id: int):
    """Delete a category"""
    db_category = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not db_category:
        return None
    
    db.delete(db_category)
    db.commit()
    return db_category


def get_statuses(db: Session):
    """Get all report statuses"""
    return db.query(models.ReportStatus).order_by(models.ReportStatus.id).all()


def get_severities(db: Session, category_id: Optional[int] = None):
    """Get all severities, optionally filtered by category"""
    query = db.query(models.Severity)
    if category_id:
        query = query.filter(models.Severity.category_id == category_id)
    return query.order_by(models.Severity.category_id, models.Severity.id).all()


def soft_delete_report(db: Session, report_id: int):
    """Soft delete a report by setting deleted_at timestamp"""
    report = get_report(db, report_id)
    if not report:
        return None
    
    report.deleted_at = datetime.utcnow()
    db.commit()
    db.refresh(report)
    return report


def restore_report(db: Session, report_id: int):
    """Restore a soft-deleted report by clearing deleted_at"""
    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not report:
        return None
    
    report.deleted_at = None
    db.commit()
    db.refresh(report)
    return report


def get_deleted_reports(db: Session, skip: int = 0, limit: int = 100):
    """Get all soft-deleted reports"""
    return db.query(models.Report).filter(
        models.Report.deleted_at != None
    ).order_by(models.Report.deleted_at.desc()).offset(skip).limit(limit).all()
