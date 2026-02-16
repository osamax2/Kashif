from datetime import datetime, timedelta
import random

import models
import schemas
from passlib.context import CryptContext
from sqlalchemy.orm import Session

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()


def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()


def get_users(db: Session, skip: int = 0, limit: int = 100, include_deleted: bool = False):
    """Get all users with pagination (excluding deleted by default)"""
    query = db.query(models.User)
    if not include_deleted:
        query = query.filter(models.User.deleted_at == None)
    return query.offset(skip).limit(limit).all()


def get_deleted_users(db: Session, skip: int = 0, limit: int = 100):
    """Get only deleted users (trash)"""
    return db.query(models.User).filter(
        models.User.deleted_at != None
    ).offset(skip).limit(limit).all()


def soft_delete_user(db: Session, user_id: int):
    """Soft delete a user by setting deleted_at timestamp"""
    user = get_user(db, user_id)
    if user:
        user.deleted_at = datetime.utcnow()
        user.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(user)
    return user


def restore_user(db: Session, user_id: int):
    """Restore a soft-deleted user"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user:
        user.deleted_at = None
        user.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(user)
    return user


def permanent_delete_user(db: Session, user_id: int):
    """Permanently delete a user from database"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user:
        db.delete(user)
        db.commit()
        return True
    return False


def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        hashed_password=hashed_password,
        full_name=user.full_name,
        phone=user.phone,
        role=user.role,
        company_id=user.company_id if hasattr(user, 'company_id') else None,
        language=user.language if hasattr(user, 'language') else 'ar'
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def authenticate_user(db: Session, email: str, password: str):
    user = get_user_by_email(db, email)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user


def create_refresh_token(db: Session, user_id: int, token: str):
    db_token = models.RefreshToken(
        token=token,
        user_id=user_id,
        expires_at=datetime.utcnow() + timedelta(days=30)
    )
    db.add(db_token)
    db.commit()
    db.refresh(db_token)
    return db_token


def get_refresh_token(db: Session, token: str):
    return db.query(models.RefreshToken).filter(models.RefreshToken.token == token).first()


def revoke_refresh_token(db: Session, token: str):
    db_token = get_refresh_token(db, token)
    if db_token:
        db_token.is_revoked = True
        db.commit()
    return db_token


def revoke_all_user_tokens(db: Session, user_id: int):
    """Revoke ALL refresh tokens for a user (used on logout and token family breach)"""
    tokens = db.query(models.RefreshToken).filter(
        models.RefreshToken.user_id == user_id,
        models.RefreshToken.is_revoked == False
    ).all()
    count = 0
    for token in tokens:
        token.is_revoked = True
        count += 1
    if count > 0:
        db.commit()
    return count


def cleanup_expired_tokens(db: Session):
    """Delete expired or revoked refresh tokens older than 7 days"""
    cutoff = datetime.utcnow() - timedelta(days=7)
    deleted = db.query(models.RefreshToken).filter(
        (models.RefreshToken.expires_at < datetime.utcnow()) |
        ((models.RefreshToken.is_revoked == True) & (models.RefreshToken.created_at < cutoff))
    ).delete(synchronize_session=False)
    db.commit()
    return deleted


def update_user_access_token(db: Session, user_id: int, access_token: str):
    """Update user's access token and last login timestamp"""
    user = get_user(db, user_id)
    if user:
        user.access_token = access_token
        user.last_login = datetime.utcnow()
        db.commit()
        db.refresh(user)
    return user


def get_levels(db: Session):
    """Get all levels"""
    return db.query(models.Level).order_by(models.Level.min_report_number).all()


def update_user_total_points(db: Session, user_id: int, points_to_add: int):
    """Update user's total_points by adding points (never goes below 0)"""
    user = get_user(db, user_id)
    if user:
        new_total = (user.total_points or 0) + points_to_add
        user.total_points = max(0, new_total)
        db.commit()
        db.refresh(user)
        return user
    return None


def update_user_language(db: Session, user_id: int, language: str):
    """Update user's language preference"""
    user = get_user(db, user_id)
    if user:
        user.language = language
        db.commit()
        db.refresh(user)
        return user
    return None


def update_user_image(db: Session, user_id: int, image_url: str):
    """Update user's profile image URL"""
    user = get_user(db, user_id)
    if user:
        user.image_url = image_url
        user.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(user)
        return user
    return None


def update_user(db: Session, user_id: int, user_update: schemas.UserUpdate):
    """Update user fields (admin only)"""
    user = get_user(db, user_id)
    if not user:
        return None
    
    # Update only provided fields
    if user_update.email is not None and user_update.email != user.email:
        existing = db.query(models.User).filter(
            models.User.email == user_update.email,
            models.User.id != user_id
        ).first()
        if existing:
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already in use by another user"
            )
        user.email = user_update.email
    if user_update.full_name is not None:
        user.full_name = user_update.full_name
    if user_update.phone is not None:
        user.phone = user_update.phone
    if user_update.role is not None:
        user.role = user_update.role
    if user_update.company_id is not None:
        user.company_id = user_update.company_id
    if user_update.status is not None:
        user.status = user_update.status
    if user_update.language is not None:
        user.language = user_update.language
    
    user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)
    return user


def verify_user_account(db: Session, user_id: int):
    """Mark user account as verified"""
    user = get_user(db, user_id)
    if user:
        user.is_verified = True
        user.status = "ACTIVE"
        user.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(user)
    return user


def update_user_password(db: Session, user_id: int, new_password: str, clear_must_change: bool = False):
    """Update user's password"""
    user = get_user(db, user_id)
    if user:
        user.hashed_password = get_password_hash(new_password)
        if clear_must_change:
            user.must_change_password = False
        user.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(user)
    return user


def create_company_user(db: Session, user: schemas.CompanyUserCreate):
    """Create a company user (by admin) - auto-verified, must change password"""
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        hashed_password=hashed_password,
        full_name=user.full_name,
        phone=user.phone,
        role="COMPANY",
        company_id=user.company_id,
        language=user.language if hasattr(user, 'language') else 'ar',
        is_verified=True,  # Company users created by admin are auto-verified
        must_change_password=True,  # Must change password on first login
        status="ACTIVE"
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def get_company_users_count(db: Session, company_id: int):
    """Get count of users in a company"""
    return db.query(models.User).filter(
        models.User.company_id == company_id,
        models.User.status != "DELETED"
    ).count()


def get_company_users(db: Session, company_id: int):
    """Get all users in a company"""
    return db.query(models.User).filter(
        models.User.company_id == company_id,
        models.User.status != "DELETED"
    ).all()


# ==================== Verification Code (OTP) ====================

def generate_verification_code() -> str:
    """Generate a random 6-digit verification code"""
    return str(random.randint(100000, 999999))


def create_verification_code(db: Session, user_id: int, email: str) -> models.VerificationCode:
    """Create a new 6-digit verification code (invalidates old ones)"""
    # Invalidate any existing unused codes for this email
    db.query(models.VerificationCode).filter(
        models.VerificationCode.email == email,
        models.VerificationCode.is_used == False
    ).update({"is_used": True})
    
    code = generate_verification_code()
    db_code = models.VerificationCode(
        email=email,
        code=code,
        user_id=user_id,
        expires_at=datetime.utcnow() + timedelta(minutes=10)
    )
    db.add(db_code)
    db.commit()
    db.refresh(db_code)
    return db_code


def verify_code(db: Session, email: str, code: str):
    """Verify a 6-digit code. Returns (success, message, user_id)"""
    db_code = db.query(models.VerificationCode).filter(
        models.VerificationCode.email == email,
        models.VerificationCode.is_used == False
    ).order_by(models.VerificationCode.created_at.desc()).first()
    
    if not db_code:
        return False, "No verification code found. Please request a new one.", None
    
    # Check expiry
    if db_code.expires_at < datetime.utcnow():
        db_code.is_used = True
        db.commit()
        return False, "Verification code expired. Please request a new one.", None
    
    # Check max attempts (5 attempts allowed)
    if db_code.attempts >= 5:
        db_code.is_used = True
        db.commit()
        return False, "Too many failed attempts. Please request a new code.", None
    
    # Verify code
    if db_code.code != code:
        db_code.attempts += 1
        db.commit()
        remaining = 5 - db_code.attempts
        return False, f"Invalid code. {remaining} attempts remaining.", None
    
    # Success - mark as used
    db_code.is_used = True
    db.commit()
    return True, "Code verified successfully.", db_code.user_id

