from datetime import datetime

from database import Base
from sqlalchemy import (Boolean, Column, DateTime, Float, ForeignKey, Integer,
                        Numeric, String, Text, Enum)
from sqlalchemy.orm import relationship
import enum


class ConfirmationStatus(enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    EXPIRED = "expired"


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    name_ar = Column(String(100), nullable=True)
    name_en = Column(String(100), nullable=True)
    color = Column(String(7), nullable=True)
    description = Column(Text, nullable=True)

    reports = relationship("Report", back_populates="category")
    severities = relationship("Severity", back_populates="category")


class ReportStatus(Base):
    __tablename__ = "report_statuses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)  # NEW, IN_PROGRESS, RESOLVED, REJECTED
    description = Column(Text, nullable=True)

    reports = relationship("Report", back_populates="status")
    old_status_histories = relationship("ReportStatusHistory", foreign_keys="ReportStatusHistory.old_status_id", back_populates="old_status")
    new_status_histories = relationship("ReportStatusHistory", foreign_keys="ReportStatusHistory.new_status_id", back_populates="new_status")


class Severity(Base):
    __tablename__ = "severities"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)  # LOW, MEDIUM, HIGH
    description = Column(Text, nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)

    category = relationship("Category", back_populates="severities")
    reports = relationship("Report", back_populates="severity")


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    status_id = Column(Integer, ForeignKey("report_statuses.id"), nullable=False)
    title = Column(String(150), nullable=True)
    description = Column(Text, nullable=False)
    latitude = Column(Numeric(9, 6), nullable=False)
    longitude = Column(Numeric(9, 6), nullable=False)
    address_text = Column(String(255), nullable=True)
    severity_id = Column(Integer, ForeignKey("severities.id"), nullable=False)
    user_hide = Column(Boolean, default=False, nullable=False)
    photo_urls = Column(Text, nullable=True)  # JSON array as text or comma-separated
    # New fields for confirmation system
    confirmation_status = Column(String(20), default="pending", nullable=False, index=True)  # pending, confirmed, expired
    confirmed_by_user_id = Column(Integer, nullable=True)  # User who confirmed this report
    confirmed_at = Column(DateTime, nullable=True)  # When the report was confirmed
    points_awarded = Column(Boolean, default=False, nullable=False)  # Whether points have been awarded
    created_at = Column(DateTime, default=datetime.utcnow, index=True, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    category = relationship("Category", back_populates="reports")
    status = relationship("ReportStatus", back_populates="reports")
    severity = relationship("Severity", back_populates="reports")
    status_history = relationship("ReportStatusHistory", back_populates="report")
    confirmations = relationship("ReportConfirmation", back_populates="report")


class ReportStatusHistory(Base):
    __tablename__ = "report_status_history"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id"), nullable=False)
    old_status_id = Column(Integer, ForeignKey("report_statuses.id"), nullable=True)
    new_status_id = Column(Integer, ForeignKey("report_statuses.id"), nullable=False)
    changed_by_user_id = Column(Integer, nullable=False)  # user_id who made the change
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    report = relationship("Report", back_populates="status_history")
    old_status = relationship("ReportStatus", foreign_keys=[old_status_id], back_populates="old_status_histories")
    new_status = relationship("ReportStatus", foreign_keys=[new_status_id], back_populates="new_status_histories")
    old_status = relationship("ReportStatus", foreign_keys=[old_status_id], back_populates="old_status_histories")
    new_status = relationship("ReportStatus", foreign_keys=[new_status_id], back_populates="new_status_histories")


class ReportConfirmation(Base):
    """Tracks confirmations/verifications of reports by other users"""
    __tablename__ = "report_confirmations"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id"), nullable=False, index=True)
    user_id = Column(Integer, nullable=False, index=True)  # User who confirmed
    confirmation_type = Column(String(30), nullable=False)  # "still_there", "similar_report", "auto_match"
    latitude = Column(Numeric(9, 6), nullable=True)  # Location of confirmer (for similar_report)
    longitude = Column(Numeric(9, 6), nullable=True)
    points_awarded = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    report = relationship("Report", back_populates="confirmations")
