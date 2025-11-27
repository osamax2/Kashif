from typing import List, Optional

import models
import schemas
from sqlalchemy import and_, func
from sqlalchemy.orm import Session


def create_report(db: Session, report: schemas.ReportCreate, user_id: int):
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
        photo_urls=report.photo_urls
    )
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    return db_report


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
    radius_km: Optional[float] = None
) -> List[models.Report]:
    query = db.query(models.Report)
    
    # Apply filters
    if status:
        query = query.filter(models.Report.status_id == status)
    
    if category:
        query = query.filter(models.Report.category_id == category)
    
    # Geo-location filter (simple distance calculation)
    if latitude is not None and longitude is not None and radius_km is not None:
        # Using Haversine formula approximation
        # This is simplified - for production use PostGIS
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
    return db.query(models.Report).filter(
        models.Report.user_id == user_id
    ).order_by(models.Report.created_at.desc()).offset(skip).limit(limit).all()


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


def get_statuses(db: Session):
    """Get all report statuses"""
    return db.query(models.ReportStatus).order_by(models.ReportStatus.id).all()


def get_severities(db: Session, category_id: Optional[int] = None):
    """Get all severities, optionally filtered by category"""
    query = db.query(models.Severity)
    if category_id:
        query = query.filter(models.Severity.category_id == category_id)
    return query.order_by(models.Severity.category_id, models.Severity.id).all()
    return query.order_by(models.Severity.category_id, models.Severity.id).all()
