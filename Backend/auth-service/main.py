import logging
import os
import threading
import uuid
from typing import Annotated

import auth
import crud
import models
import schemas
from database import engine, get_db
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from rabbitmq_consumer import start_consumer
from rabbitmq_publisher import publish_event
from sqlalchemy.orm import Session

# Create database tables
models.Base.metadata.create_all(bind=engine)

# Create uploads directory if it doesn't exist
UPLOAD_DIR = "/app/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI(title="Auth Service")

# Mount static files for uploads
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for admin panel
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Start RabbitMQ consumer in background thread
consumer_thread = threading.Thread(target=start_consumer, daemon=True)
consumer_thread.start()


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "auth"}


@app.get("/levels", response_model=list[schemas.Level])
def get_levels(db: Session = Depends(get_db)):
    """Get all user levels"""
    return crud.get_levels(db=db)


@app.post("/register", response_model=schemas.User)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user (not verified by default)
    new_user = crud.create_user(db=db, user=user)
    
    # Generate verification token
    verification_token = auth.create_verification_token(data={"user_id": new_user.id, "email": new_user.email})
    
    # Publish UserRegistered event with verification token
    try:
        publish_event("user.registered", {
            "user_id": new_user.id,
            "email": new_user.email,
            "full_name": new_user.full_name,
            "role": new_user.role,
            "verification_token": verification_token
        })
        logger.info(f"Published UserRegistered event for user {new_user.id}")
    except Exception as e:
        logger.error(f"Failed to publish UserRegistered event: {e}")
    
    return new_user


@app.post("/token", response_model=schemas.Token)
def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Session = Depends(get_db)
):
    user = crud.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user account is verified (for regular users, not admins/company users created by admin)
    if not user.is_verified and user.role == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account not verified. Please check your email to activate your account.",
        )
    
    access_token = auth.create_access_token(data={"sub": user.email, "user_id": user.id})
    refresh_token = auth.create_refresh_token(data={"sub": user.email, "user_id": user.id})
    
    # Save access token and refresh token to database
    crud.update_user_access_token(db, user.id, access_token)
    crud.create_refresh_token(db, user.id, refresh_token)
    
    # Include must_change_password flag in response for frontend handling
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "must_change_password": user.must_change_password
    }


@app.post("/refresh", response_model=schemas.Token)
def refresh_token(token_data: schemas.RefreshTokenRequest, db: Session = Depends(get_db)):
    payload = auth.verify_refresh_token(token_data.refresh_token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    # Check if refresh token exists in database
    db_token = crud.get_refresh_token(db, token_data.refresh_token)
    if not db_token or db_token.is_revoked:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token revoked or invalid"
        )
    
    user = crud.get_user_by_email(db, payload.get("sub"))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    # Create new tokens
    access_token = auth.create_access_token(data={"sub": user.email, "user_id": user.id})
    new_refresh_token = auth.create_refresh_token(data={"sub": user.email, "user_id": user.id})
    
    # Save access token, revoke old refresh token and save new one
    crud.update_user_access_token(db, user.id, access_token)
    crud.revoke_refresh_token(db, token_data.refresh_token)
    crud.create_refresh_token(db, user.id, new_refresh_token)
    
    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }


@app.get("/me", response_model=schemas.User)
def get_current_user_info(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Session = Depends(get_db)
):
    user = auth.get_current_user(token, db)
    return user


@app.post("/verify-account")
def verify_account(
    request: schemas.VerifyAccountRequest,
    db: Session = Depends(get_db)
):
    """Verify user account using verification token from email"""
    try:
        payload = auth.verify_verification_token(request.token)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired verification token"
            )
        
        user_id = payload.get("user_id")
        user = crud.get_user(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        if user.is_verified:
            return {"message": "Account already verified"}
        
        # Activate the account
        crud.verify_user_account(db, user_id)
        
        return {"message": "Account verified successfully. You can now login."}
    except Exception as e:
        logger.error(f"Account verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token"
        )


@app.post("/resend-verification")
def resend_verification_email(
    request: schemas.ResendVerificationRequest,
    db: Session = Depends(get_db)
):
    """Resend verification email"""
    user = crud.get_user_by_email(db, request.email)
    if not user:
        # Don't reveal if email exists
        return {"message": "If the email exists, a verification link has been sent."}
    
    if user.is_verified:
        return {"message": "Account is already verified."}
    
    # Generate verification token
    verification_token = auth.create_verification_token(data={"user_id": user.id, "email": user.email})
    
    # Publish event to send verification email
    try:
        publish_event("user.verification_resend", {
            "user_id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "verification_token": verification_token
        })
        logger.info(f"Published verification resend event for user {user.id}")
    except Exception as e:
        logger.error(f"Failed to publish verification resend event: {e}")
    
    return {"message": "If the email exists, a verification link has been sent."}


@app.post("/change-password")
def change_password(
    request: schemas.ChangePasswordRequest,
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Session = Depends(get_db)
):
    """Change user password (requires current password)"""
    user = auth.get_current_user(token, db)
    
    # Verify current password
    if not auth.verify_password(request.current_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Update password
    crud.update_user_password(db, user.id, request.new_password)
    
    return {"message": "Password changed successfully"}


@app.post("/force-change-password")
def force_change_password(
    request: schemas.ForceChangePasswordRequest,
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Session = Depends(get_db)
):
    """Change password on first login (for users who must change password)"""
    user = auth.get_current_user(token, db)
    
    if not user.must_change_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password change not required"
        )
    
    # Update password and clear the flag
    crud.update_user_password(db, user.id, request.new_password, clear_must_change=True)
    
    return {"message": "Password changed successfully"}


@app.post("/logout")
def logout(
    token_data: schemas.RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    crud.revoke_refresh_token(db, token_data.refresh_token)
    return {"message": "Logged out successfully"}


@app.get("/users", response_model=list[schemas.User])
def get_all_users(
    token: Annotated[str, Depends(oauth2_scheme)],
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all users - Admin only"""
    current_user = auth.get_current_user(token, db)
    
    # Only admins can list all users
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized. Admin role required."
        )
    
    users = crud.get_users(db, skip=skip, limit=limit)
    return users


@app.get("/users/{user_id}", response_model=schemas.User)
def get_user(
    user_id: int,
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Session = Depends(get_db)
):
    # Verify token
    current_user = auth.get_current_user(token, db)
    
    # Only allow users to get their own info, or admins to get any user
    if current_user.id != user_id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this user"
        )
    
    user = crud.get_user(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user


@app.patch("/users/{user_id}", response_model=schemas.User)
def update_user(
    user_id: int,
    user_update: schemas.UserUpdate,
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Session = Depends(get_db)
):
    """Update user - Admin only"""
    current_user = auth.get_current_user(token, db)
    
    # Only admins can update users
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized. Admin role required."
        )
    
    updated_user = crud.update_user(db, user_id, user_update)
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return updated_user


@app.post("/users/company", response_model=schemas.User)
def create_company_user(
    user_data: schemas.CompanyUserCreate,
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Session = Depends(get_db)
):
    """Create a company user - Admin only
    
    This creates a user with role=COMPANY who can only manage coupons
    for their assigned company.
    """
    current_user = auth.get_current_user(token, db)
    
    # Only admins can create company users
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized. Admin role required."
        )
    
    # Check if user already exists
    db_user = crud.get_user_by_email(db, email=user_data.email)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user with COMPANY role
    user_create = schemas.UserCreate(
        email=user_data.email,
        password=user_data.password,
        full_name=user_data.full_name,
        phone=user_data.phone,
        role="COMPANY",
        company_id=user_data.company_id,
        language=user_data.language
    )
    
    new_user = crud.create_user(db=db, user=user_create)
    
    logger.info(f"Created company user {new_user.id} for company {user_data.company_id}")
    
    return new_user


@app.patch("/me/language")
def update_language_preference(
    language_data: schemas.LanguageUpdate,
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Session = Depends(get_db)
):
    """
    Update user's language preference.
    
    Request body:
    {
        "language": "ar"  // or "en"
    }
    """
    # Verify token and get current user
    current_user = auth.get_current_user(token, db)
    
    # Validate language
    if language_data.language not in ['ar', 'en']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid language. Must be 'ar' or 'en'"
        )
    
    # Update user's language
    updated_user = crud.update_user_language(db, current_user.id, language_data.language)
    
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update language preference"
        )
    
    return {
        "message": "Language preference updated successfully",
        "language": updated_user.language
    }


# File Upload Endpoints
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """
    Upload an image file and return the URL.
    Supports: jpg, jpeg, png, gif, webp
    Max size: 5MB
    """
    # Verify token
    current_user = auth.get_current_user(token, db)
    
    # Check file extension
    file_ext = os.path.splitext(file.filename)[1].lower() if file.filename else ''
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Read file content
    content = await file.read()
    
    # Check file size
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB"
        )
    
    # Generate unique filename
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    # Save file
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Return the URL (relative path that will be served via nginx)
    return {
        "url": f"/api/auth/uploads/{unique_filename}",
        "filename": unique_filename
    }
