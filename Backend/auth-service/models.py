import uuid as uuid_lib
from datetime import datetime

from database import Base
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship


class Level(Base):
    __tablename__ = "levels"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    min_report_number = Column(Integer, nullable=False)

    users = relationship("User", back_populates="level")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(UUID(as_uuid=True), default=uuid_lib.uuid4, unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    access_token = Column(String(255), nullable=True)  # Store current access token
    full_name = Column(String(150), nullable=False)
    phone = Column(String(30), nullable=True)
    role = Column(String(50), default="USER", nullable=False)  # USER, ADMIN, COMPANY
    company_id = Column(Integer, nullable=True)  # For COMPANY role users - links to company in coupons-service
    total_points = Column(Integer, default=0, nullable=False)
    image_url = Column(String(255), nullable=True)
    level_id = Column(Integer, ForeignKey("levels.id"), nullable=True)
    status = Column(String(50), default="ACTIVE", nullable=False)  # ACTIVE, BANNED, PENDING
    is_verified = Column(Boolean, default=False, nullable=False)  # Email verification status
    must_change_password = Column(Boolean, default=False, nullable=False)  # Force password change on first login
    language = Column(String(2), default="ar", nullable=False)  # ar or en
    city = Column(String(100), nullable=True)  # City for government employees
    district = Column(String(100), nullable=True)  # District for government employees
    job_description = Column(String(255), nullable=True)  # Job description for government employees
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True, index=True)  # Soft delete timestamp

    level = relationship("Level", back_populates="users")
    refresh_tokens = relationship("RefreshToken", back_populates="user")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, index=True)
    token = Column(String, unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_revoked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)

    user = relationship("User", back_populates="refresh_tokens")


class VerificationCode(Base):
    __tablename__ = "verification_codes"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), index=True, nullable=False)
    code = Column(String(6), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_used = Column(Boolean, default=False)
    attempts = Column(Integer, default=0)  # Track failed attempts
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)

    user = relationship("User")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    action = Column(String(100), nullable=False, index=True)  # e.g. "user.update", "report.delete", "user.bulk_status"
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    user_email = Column(String(255), nullable=True)  # Denormalized for quick display
    target_type = Column(String(50), nullable=True)  # "user", "report", "coupon", etc.
    target_id = Column(Integer, nullable=True)
    details = Column(Text, nullable=True)  # JSON string with details
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    user = relationship("User")


class TermsOfService(Base):
    """Stores terms of service versions"""
    __tablename__ = "terms_of_service"

    id = Column(Integer, primary_key=True, index=True)
    version = Column(String(20), nullable=False, unique=True)  # e.g. "1.0", "1.1"
    title_ar = Column(String(255), nullable=False)
    title_en = Column(String(255), nullable=False)
    content_ar = Column(Text, nullable=False)
    content_en = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    requires_re_acceptance = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    acceptances = relationship("UserTosAcceptance", back_populates="tos")


class UserTosAcceptance(Base):
    """Tracks which TOS version a user has accepted"""
    __tablename__ = "user_tos_acceptances"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    tos_id = Column(Integer, ForeignKey("terms_of_service.id"), nullable=False)
    accepted_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    ip_address = Column(String(45), nullable=True)

    user = relationship("User")
    tos = relationship("TermsOfService", back_populates="acceptances")