from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import Optional, List
import models
import schemas


def create_report(db: Session, report: schemas.ReportCreate, user_id: int):
    db_report = models.Report(
        user_id=user_id,
        title=report.title,
        description=report.description,
        category=report.category,
        latitude=report.latitude,
        longitude=report.longitude,
        address=report.address,
        image_url=report.image_url
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
        query = query.filter(models.Report.status == status)
    
    if category:
        query = query.filter(models.Report.category == category)
    
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
    
    old_status = report.status
    
    # Update report status
    report.status = new_status
    
    # Create status history entry
    history = models.ReportStatusHistory(
        report_id=report_id,
        old_status=old_status,
        new_status=new_status,
        comment=comment,
        changed_by=updated_by
    )
    db.add(history)
    
    db.commit()
    db.refresh(report)
    return report


def get_report_history(db: Session, report_id: int):
    return db.query(models.ReportStatusHistory).filter(
        models.ReportStatusHistory.report_id == report_id
    ).order_by(models.ReportStatusHistory.changed_at.desc()).all()
