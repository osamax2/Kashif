from datetime import datetime, timedelta

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


def get_users(db: Session, skip: int = 0, limit: int = 100):
    """Get all users with pagination"""
    return db.query(models.User).offset(skip).limit(limit).all()


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
    """Update user's total_points by adding points"""
    user = get_user(db, user_id)
    if user:
        user.total_points = (user.total_points or 0) + points_to_add
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


def update_user(db: Session, user_id: int, user_update: schemas.UserUpdate):
    """Update user fields (admin only)"""
    user = get_user(db, user_id)
    if not user:
        return None
    
    # Update only provided fields
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
    return user

