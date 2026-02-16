from datetime import datetime

from database import Base
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
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
