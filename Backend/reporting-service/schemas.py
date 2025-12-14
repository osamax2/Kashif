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


class Report(ReportBase):
    id: int
    user_id: int
    status_id: int
    user_hide: bool
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
    comment: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
        from_attributes = True
