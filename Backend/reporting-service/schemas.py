from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel


class CategoryBase(BaseModel):
    name: str
    name_ar: Optional[str] = None
    name_en: Optional[str] = None
    color: Optional[str] = None
    description: Optional[str] = None


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    name_ar: Optional[str] = None
    name_en: Optional[str] = None
    color: Optional[str] = None
    description: Optional[str] = None


class Category(CategoryBase):
    id: int

    class Config:
        from_attributes = True


class ReportStatusBase(BaseModel):
    name: str
    description: Optional[str] = None


class ReportStatus(ReportStatusBase):
    id: int

    class Config:
        from_attributes = True


class SeverityBase(BaseModel):
    name: str
    description: Optional[str] = None
    category_id: int


class Severity(SeverityBase):
    id: int

    class Config:
        from_attributes = True


class ReportBase(BaseModel):
    title: Optional[str] = None
    description: str
    category_id: int
    latitude: Decimal
    longitude: Decimal
    address_text: Optional[str] = None
    severity_id: int
    photo_urls: Optional[str] = None  # JSON string or comma-separated
    ai_annotated_url: Optional[str] = None  # URL to annotated image with bounding boxes
    ai_detections: Optional[str] = None  # JSON string of detection bounding boxes


class ReportCreate(ReportBase):
    pass


class ReportUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[int] = None
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None
    address_text: Optional[str] = None
    severity_id: Optional[int] = None
    status_id: Optional[int] = None
    photo_urls: Optional[str] = None
    ai_annotated_url: Optional[str] = None
    ai_detections: Optional[str] = None


class Report(ReportBase):
    id: int
    user_id: int
    user_name: Optional[str] = None
    user_phone: Optional[str] = None
    user_email: Optional[str] = None
    status_id: int
    user_hide: bool
    confirmation_status: str = "pending"  # pending, confirmed, expired
    confirmed_by_user_id: Optional[int] = None
    confirmed_at: Optional[datetime] = None
    confirmation_count: int = 0  # Number of users who confirmed this report
    points_awarded: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ReportStatusUpdate(BaseModel):
    status_id: int
    comment: Optional[str] = None


class ReportStatusHistory(BaseModel):
    id: int
    report_id: int
    old_status_id: Optional[int] = None
    new_status_id: int
    changed_by_user_id: int
    changed_by_user_name: Optional[str] = None
    changed_by_user_email: Optional[str] = None
    comment: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ReportConfirmation(BaseModel):
    id: int
    report_id: int
    user_id: int
    confirmation_type: str
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None
    points_awarded: bool
    created_at: datetime

    class Config:
        from_attributes = True


class NearbyDuplicate(BaseModel):
    """A nearby report that might be a duplicate"""
    id: int
    title: Optional[str] = None
    description: str
    category_id: int
    latitude: Decimal
    longitude: Decimal
    address_text: Optional[str] = None
    confirmation_status: str = "pending"
    confirmation_count: int = 0
    status_id: int
    created_at: datetime
    distance_meters: float
    photo_urls: Optional[str] = None

    class Config:
        from_attributes = True


class DuplicateCheckResponse(BaseModel):
    """Response for duplicate check"""
    has_duplicates: bool
    count: int
    nearby_reports: List[NearbyDuplicate]
    message: str


class ConfirmReportRequest(BaseModel):
    """Request to confirm a report exists (Still There button)"""
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None


class ConfirmReportResponse(BaseModel):
    """Response after confirming a report"""
    success: bool
    message: str
    report_confirmed: bool
    points_awarded: int


class RouteWaypoint(BaseModel):
    """A single point along a route"""
    latitude: float
    longitude: float


class RouteReportsRequest(BaseModel):
    """Request to find reports along a route"""
    waypoints: List[RouteWaypoint]
    buffer_meters: float = 200.0  # How far from route to search (default 200m)


class RouteReport(BaseModel):
    """A report found along a route with distance info"""
    id: int
    title: Optional[str] = None
    description: str
    category_id: int
    latitude: Decimal
    longitude: Decimal
    address_text: Optional[str] = None
    status_id: int
    created_at: datetime
    distance_from_route_meters: float
    nearest_waypoint_index: int
    photo_urls: Optional[str] = None
    confirmation_status: str = "pending"

    class Config:
        from_attributes = True


class RouteReportsResponse(BaseModel):
    """Response for route reports query"""
    total_hazards: int
    reports: List[RouteReport]
    summary: dict  # category_id -> count


# ============ Bulk Operations ============

class BulkStatusUpdate(BaseModel):
    """Bulk update status of multiple reports"""
    report_ids: List[int]
    status_id: int
    comment: Optional[str] = None


class BulkDeleteRequest(BaseModel):
    """Bulk soft-delete multiple reports"""
    report_ids: List[int]


class BulkOperationResult(BaseModel):
    """Result of a bulk operation"""
    success_count: int
    failed_count: int
    failed_ids: List[int]
    message: str
