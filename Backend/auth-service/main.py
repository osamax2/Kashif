import logging
import os
import threading
import uuid
from typing import Annotated

import auth
import crud
import httpx
import models
import schemas
from database import engine, get_db
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from rabbitmq_consumer import start_consumer
from rabbitmq_publisher import publish_event
from sqlalchemy.orm import Session

# Create database tables
models.Base.metadata.create_all(bind=engine)

# Create uploads directory if it doesn't exist
UPLOAD_DIR = "/app/uploads"
TEMPLATES_DIR = "/app/templates"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(TEMPLATES_DIR, exist_ok=True)

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

# Service URLs for DSGVO cascade operations
REPORTING_SERVICE_URL = os.getenv("REPORTING_SERVICE_URL", "http://reporting-service:8000")
GAMIFICATION_SERVICE_URL = os.getenv("GAMIFICATION_SERVICE_URL", "http://gamification-service:8000")
COUPONS_SERVICE_URL = os.getenv("COUPONS_SERVICE_URL", "http://coupons-service:8000")
NOTIFICATION_SERVICE_URL = os.getenv("NOTIFICATION_SERVICE_URL", "http://notification-service:8000")
INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "kashif-internal-secret-2026")

# Start RabbitMQ consumer in background thread
consumer_thread = threading.Thread(target=start_consumer, daemon=True)
consumer_thread.start()


def periodic_token_cleanup():
    """Periodically clean up expired/revoked refresh tokens every 6 hours"""
    import time
    while True:
        try:
            time.sleep(6 * 60 * 60)  # Every 6 hours
            from database import SessionLocal
            db = SessionLocal()
            try:
                deleted = crud.cleanup_expired_tokens(db)
                if deleted > 0:
                    logger.info(f"Token cleanup: removed {deleted} expired/revoked tokens")
            finally:
                db.close()
        except Exception as e:
            logger.error(f"Token cleanup error: {e}")


cleanup_thread = threading.Thread(target=periodic_token_cleanup, daemon=True)
cleanup_thread.start()


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "auth"}


@app.get("/reset-password", response_class=HTMLResponse)
def reset_password_page():
    """Serve the password reset HTML page"""
    template_path = os.path.join(TEMPLATES_DIR, "reset-password.html")
    
    # Fallback to local templates directory
    if not os.path.exists(template_path):
        template_path = os.path.join(os.path.dirname(__file__), "templates", "reset-password.html")
    
    try:
        with open(template_path, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read(), status_code=200)
    except FileNotFoundError:
        return HTMLResponse(
            content="<html><body><h1>Page not found</h1></body></html>",
            status_code=404
        )


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
    
    # Generate 6-digit OTP verification code
    verification_code_obj = crud.create_verification_code(db, new_user.id, new_user.email)
    
    # Publish UserRegistered event with verification token (sends email link)
    try:
        publish_event("user.registered", {
            "user_id": new_user.id,
            "email": new_user.email,
            "full_name": new_user.full_name,
            "role": new_user.role,
            "verification_token": verification_token,
            "language": new_user.language or "ar"
        })
        logger.info(f"Published UserRegistered event for user {new_user.id}")
    except Exception as e:
        logger.error(f"Failed to publish UserRegistered event: {e}")
    
    # Publish verification code event (sends OTP code email)
    try:
        publish_event("user.verification_code", {
            "user_id": new_user.id,
            "email": new_user.email,
            "full_name": new_user.full_name,
            "verification_code": verification_code_obj.code,
            "language": new_user.language or "ar"
        })
        logger.info(f"Published verification code event for user {new_user.id}")
    except Exception as e:
        logger.error(f"Failed to publish verification code event: {e}")
    
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
    if not db_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not found"
        )

    # Token family protection: if a revoked token is reused, revoke ALL user tokens
    if db_token.is_revoked:
        logger.warning(f"Revoked refresh token reuse detected for user {db_token.user_id} - revoking all tokens")
        crud.revoke_all_user_tokens(db, db_token.user_id)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token revoked - possible token theft detected. All sessions invalidated."
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


@app.get("/verify", response_class=HTMLResponse)
def verify_email_link(
    token: str,
    db: Session = Depends(get_db)
):
    """Verify user account using verification token from email link (GET request)"""
    try:
        payload = auth.verify_verification_token(token)
        if not payload:
            return HTMLResponse(content="""
            <!DOCTYPE html>
            <html lang="ar" dir="rtl">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>فشل التحقق - كاشف</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; margin: 0; }
                    .container { background: white; padding: 40px; border-radius: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); text-align: center; max-width: 400px; }
                    .icon { font-size: 60px; margin-bottom: 20px; }
                    h1 { color: #e74c3c; margin-bottom: 15px; }
                    p { color: #666; line-height: 1.6; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="icon">❌</div>
                    <h1>فشل التحقق</h1>
                    <p>رابط التحقق غير صالح أو منتهي الصلاحية.</p>
                    <p>يرجى طلب رابط تحقق جديد من التطبيق.</p>
                </div>
            </body>
            </html>
            """, status_code=400)
        
        user_id = payload.get("user_id")
        user = crud.get_user(db, user_id)
        if not user:
            return HTMLResponse(content="""
            <!DOCTYPE html>
            <html lang="ar" dir="rtl">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>المستخدم غير موجود - كاشف</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; margin: 0; }
                    .container { background: white; padding: 40px; border-radius: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); text-align: center; max-width: 400px; }
                    .icon { font-size: 60px; margin-bottom: 20px; }
                    h1 { color: #e74c3c; margin-bottom: 15px; }
                    p { color: #666; line-height: 1.6; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="icon">❌</div>
                    <h1>المستخدم غير موجود</h1>
                    <p>لم يتم العثور على الحساب المرتبط بهذا الرابط.</p>
                </div>
            </body>
            </html>
            """, status_code=404)
        
        if user.is_verified:
            return HTMLResponse(content="""
            <!DOCTYPE html>
            <html lang="ar" dir="rtl">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>تم التحقق مسبقاً - كاشف</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; margin: 0; }
                    .container { background: white; padding: 40px; border-radius: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); text-align: center; max-width: 400px; }
                    .icon { font-size: 60px; margin-bottom: 20px; }
                    h1 { color: #3498db; margin-bottom: 15px; }
                    p { color: #666; line-height: 1.6; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="icon">ℹ️</div>
                    <h1>تم التحقق مسبقاً</h1>
                    <p>حسابك مفعل بالفعل.</p>
                    <p>يمكنك تسجيل الدخول من التطبيق.</p>
                </div>
            </body>
            </html>
            """, status_code=200)
        
        # Activate the account
        crud.verify_user_account(db, user_id)
        logger.info(f"Account verified successfully for user_id={user_id}")
        
        return HTMLResponse(content="""
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>تم التحقق بنجاح - كاشف</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; margin: 0; }
                .container { background: white; padding: 40px; border-radius: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); text-align: center; max-width: 400px; }
                .icon { font-size: 60px; margin-bottom: 20px; }
                h1 { color: #27ae60; margin-bottom: 15px; }
                p { color: #666; line-height: 1.6; }
                .success-check { animation: pulse 1s ease-in-out; }
                @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="icon success-check">✅</div>
                <h1>تم التحقق بنجاح!</h1>
                <p>تم تفعيل حسابك بنجاح.</p>
                <p>يمكنك الآن تسجيل الدخول من التطبيق.</p>
            </div>
        </body>
        </html>
        """, status_code=200)
    except Exception as e:
        logger.error(f"Account verification error (GET /verify): {e}")
        return HTMLResponse(content=f"""
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>خطأ في التحقق - كاشف</title>
            <style>
                body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; margin: 0; }}
                .container {{ background: white; padding: 40px; border-radius: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); text-align: center; max-width: 400px; }}
                .icon {{ font-size: 60px; margin-bottom: 20px; }}
                h1 {{ color: #e74c3c; margin-bottom: 15px; }}
                p {{ color: #666; line-height: 1.6; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="icon">❌</div>
                <h1>خطأ في التحقق</h1>
                <p>حدث خطأ أثناء التحقق من حسابك.</p>
                <p>يرجى المحاولة مرة أخرى أو التواصل مع الدعم.</p>
            </div>
        </body>
        </html>
        """, status_code=400)


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


@app.post("/verify-code")
def verify_code_endpoint(
    request: schemas.VerifyCodeRequest,
    db: Session = Depends(get_db)
):
    """Verify user account using 6-digit OTP code sent to email"""
    success, message, user_id = crud.verify_code(db, request.email, request.code)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    # Activate the account
    if user_id:
        user = crud.get_user(db, user_id)
        if user and not user.is_verified:
            crud.verify_user_account(db, user_id)
            logger.info(f"User {user_id} verified via OTP code")
    
    return {"message": "Account verified successfully. You can now login."}


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
    
    # Generate new OTP code
    verification_code_obj = crud.create_verification_code(db, user.id, user.email)
    
    # Publish event to send verification email (link)
    try:
        publish_event("user.verification_resend", {
            "user_id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "verification_token": verification_token,
            "language": user.language or "ar"
        })
        logger.info(f"Published verification resend event for user {user.id}")
    except Exception as e:
        logger.error(f"Failed to publish verification resend event: {e}")
    
    # Publish event to send OTP code email
    try:
        publish_event("user.verification_code", {
            "user_id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "verification_code": verification_code_obj.code,
            "language": user.language or "ar"
        })
        logger.info(f"Published verification code resend for user {user.id}")
    except Exception as e:
        logger.error(f"Failed to publish verification code event: {e}")
    
    return {"message": "If the email exists, a verification code has been sent."}


@app.post("/forgot-password")
def forgot_password(
    request: schemas.ForgotPasswordRequest,
    db: Session = Depends(get_db)
):
    """Request password reset email"""
    user = crud.get_user_by_email(db, request.email)
    
    # Don't reveal if email exists for security
    if not user:
        return {"message": "If the email exists, a password reset link has been sent."}
    
    # Generate password reset token
    reset_token = auth.create_password_reset_token(data={"user_id": user.id, "email": user.email})
    
    # Publish event to send password reset email
    try:
        publish_event("user.password_reset", {
            "user_id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "reset_token": reset_token,
            "language": user.language or "ar"
        })
        logger.info(f"Published password reset event for user {user.id}")
    except Exception as e:
        logger.error(f"Failed to publish password reset event: {e}")
    
    return {"message": "If the email exists, a password reset link has been sent."}


@app.post("/reset-password")
def reset_password(
    request: schemas.ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    """Reset password using token from email"""
    try:
        payload = auth.verify_password_reset_token(request.token)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired password reset token"
            )
        
        user_id = payload.get("user_id")
        user = crud.get_user(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Update password
        crud.update_user_password(db, user_id, request.new_password)
        
        logger.info(f"Password reset successful for user {user_id}")
        return {"message": "Password reset successfully. You can now login with your new password."}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Password reset error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset token"
        )


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


@app.post("/users/{user_id}/reset-password")
def admin_reset_password(
    user_id: int,
    request: schemas.AdminResetPasswordRequest,
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Session = Depends(get_db)
):
    """Admin endpoint to reset any user's password"""
    current_user = auth.get_current_user(token, db)
    
    # Only admins can reset passwords
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized. Admin role required."
        )
    
    # Get the target user
    target_user = crud.get_user(db, user_id)
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update password (optionally require change on next login)
    crud.update_user_password(db, user_id, request.new_password, clear_must_change=False)
    
    return {"message": f"Password reset successfully for user {target_user.email}"}


@app.post("/users/admin", response_model=schemas.User)
def create_admin_user(
    user_data: schemas.AdminUserCreate,
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Session = Depends(get_db)
):
    """Admin endpoint to create a new admin user"""
    current_user = auth.get_current_user(token, db)
    
    # Only admins can create admin users
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized. Admin role required."
        )
    
    # Check if email already exists
    existing_user = crud.get_user_by_email(db, user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create the admin user
    user_create = schemas.UserCreate(
        email=user_data.email,
        password=user_data.password,
        full_name=user_data.full_name,
        phone=user_data.phone,
        language=user_data.language,
        role="ADMIN"
    )
    
    new_user = crud.create_user(db, user_create)
    
    # Admin users don't need email verification
    new_user.is_verified = True
    db.commit()
    db.refresh(new_user)
    
    return new_user


@app.post("/logout")
def logout(
    token_data: schemas.RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    # Get the refresh token to find the user
    db_token = crud.get_refresh_token(db, token_data.refresh_token)
    if db_token:
        # Revoke ALL refresh tokens for this user (logout from all devices)
        crud.revoke_all_user_tokens(db, db_token.user_id)
    else:
        # Fallback: revoke just this token string
        crud.revoke_refresh_token(db, token_data.refresh_token)
    return {"message": "Logged out successfully"}


@app.get("/users", response_model=list[schemas.User])
def get_all_users(
    token: Annotated[str, Depends(oauth2_scheme)],
    skip: int = 0,
    limit: int = 100,
    include_deleted: bool = False,
    db: Session = Depends(get_db)
):
    """Get all users - Admin only. Set include_deleted=true to see all users including deleted."""
    current_user = auth.get_current_user(token, db)
    
    # Only admins can list all users
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized. Admin role required."
        )
    
    users = crud.get_users(db, skip=skip, limit=limit, include_deleted=include_deleted)
    return users


@app.get("/users/trash", response_model=list[schemas.User])
def get_deleted_users(
    token: Annotated[str, Depends(oauth2_scheme)],
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all deleted users (trash) - Admin only"""
    current_user = auth.get_current_user(token, db)
    
    # Only admins can view trash
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized. Admin role required."
        )
    
    users = crud.get_deleted_users(db, skip=skip, limit=limit)
    return users


@app.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Session = Depends(get_db)
):
    """Soft delete a user (move to trash) - Admin only"""
    current_user = auth.get_current_user(token, db)
    
    # Only admins can delete users
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized. Admin role required."
        )
    
    # Can't delete yourself
    if current_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete yourself"
        )
    
    user = crud.soft_delete_user(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    logger.info(f"User {user_id} soft deleted by admin {current_user.id}")
    return {"message": "User moved to trash", "user_id": user_id}


@app.post("/users/{user_id}/restore")
def restore_user(
    user_id: int,
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Session = Depends(get_db)
):
    """Restore a deleted user from trash - Admin only"""
    current_user = auth.get_current_user(token, db)
    
    # Only admins can restore users
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized. Admin role required."
        )
    
    user = crud.restore_user(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    logger.info(f"User {user_id} restored by admin {current_user.id}")
    return {"message": "User restored successfully", "user_id": user_id}


@app.delete("/users/{user_id}/permanent")
def permanent_delete_user(
    user_id: int,
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Session = Depends(get_db)
):
    """Permanently delete a user - Admin only. This action cannot be undone!"""
    current_user = auth.get_current_user(token, db)
    
    # Only admins can permanently delete users
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized. Admin role required."
        )
    
    # Can't delete yourself
    if current_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete yourself"
        )
    
    success = crud.permanent_delete_user(db, user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    logger.info(f"User {user_id} permanently deleted by admin {current_user.id}")
    return {"message": "User permanently deleted", "user_id": user_id}


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


@app.post("/users/government", response_model=schemas.User)
def create_government_user(
    user_data: schemas.GovernmentUserCreate,
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Session = Depends(get_db)
):
    """Create a government employee user - Admin only
    
    This creates a user with role=GOVERNMENT who can view and manage reports
    and access the map.
    """
    current_user = auth.get_current_user(token, db)
    
    # Only admins can create government users
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
    
    # Create user with GOVERNMENT role
    user_create = schemas.UserCreate(
        email=user_data.email,
        password=user_data.password,
        full_name=user_data.full_name,
        phone=user_data.phone,
        role="GOVERNMENT",
        language=user_data.language
    )
    
    new_user = crud.create_user(db=db, user=user_create)
    
    # Set additional government-specific fields
    if user_data.city:
        new_user.city = user_data.city
    if user_data.district:
        new_user.district = user_data.district
    if user_data.job_description:
        new_user.job_description = user_data.job_description
    
    db.commit()
    db.refresh(new_user)
    
    logger.info(f"Created government user {new_user.id}")
    
    return new_user


@app.post("/users/normal", response_model=schemas.User)
def create_normal_user(
    user_data: schemas.NormalUserCreate,
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Session = Depends(get_db)
):
    """Create a normal user - Admin only
    
    This creates a user with role=USER who can report issues and earn points.
    Phone number is required for normal users.
    """
    current_user = auth.get_current_user(token, db)
    
    # Only admins can create users via this endpoint
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
    
    # Create user with USER role
    user_create = schemas.UserCreate(
        email=user_data.email,
        password=user_data.password,
        full_name=user_data.full_name,
        phone=user_data.phone,
        role="USER",
        language=user_data.language
    )
    
    new_user = crud.create_user(db=db, user=user_create)
    
    # Auto-verify since admin created the account
    new_user.is_verified = True
    db.commit()
    db.refresh(new_user)
    
    logger.info(f"Created normal user {new_user.id} by admin {current_user.id}")
    
    return new_user


@app.get("/users/company/{company_id}/count")
def get_company_users_count(
    company_id: int,
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Session = Depends(get_db)
):
    """Get count of users in a company"""
    current_user = auth.get_current_user(token, db)
    
    # Allow admin or company users of the same company
    if current_user.role not in ["ADMIN", "COMPANY"] or \
       (current_user.role == "COMPANY" and current_user.company_id != company_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )
    
    count = crud.get_company_users_count(db, company_id)
    return {"company_id": company_id, "user_count": count}


@app.get("/users/company/{company_id}/members")
def get_company_members(
    company_id: int,
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Session = Depends(get_db)
):
    """Get all users in a company"""
    current_user = auth.get_current_user(token, db)
    
    # Allow admin or company users of the same company
    if current_user.role not in ["ADMIN", "COMPANY"] or \
       (current_user.role == "COMPANY" and current_user.company_id != company_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )
    
    users = crud.get_company_users(db, company_id)
    return users


@app.post("/users/company/add-member", response_model=schemas.User)
def add_company_member(
    user_data: schemas.CompanyMemberCreate,
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Session = Depends(get_db)
):
    """Add a member to company - Company users can add members to their own company
    
    This creates a user with role=COMPANY who belongs to the same company.
    Respects the max_users limit set by admin.
    """
    current_user = auth.get_current_user(token, db)
    
    # Only company users can add members
    if current_user.role != "COMPANY":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only company users can add members to their company"
        )
    
    if not current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are not assigned to any company"
        )
    
    # Check if user already exists
    db_user = crud.get_user_by_email(db, email=user_data.email)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check company user limit (need to fetch from coupons service)
    # For now, we'll check against a reasonable default
    current_count = crud.get_company_users_count(db, current_user.company_id)
    
    # Default max is 5 if not specified
    max_users = user_data.max_users if hasattr(user_data, 'max_users') and user_data.max_users else 5
    
    if current_count >= max_users:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Company has reached maximum user limit ({max_users})"
        )
    
    # Create user with COMPANY role in the same company
    user_create = schemas.UserCreate(
        email=user_data.email,
        password=user_data.password,
        full_name=user_data.full_name,
        phone=user_data.phone,
        role="COMPANY",
        company_id=current_user.company_id,
        language=user_data.language or current_user.language
    )
    
    new_user = crud.create_user(db=db, user=user_create)
    
    logger.info(f"Company user {current_user.id} added member {new_user.id} to company {current_user.company_id}")
    
    return new_user


@app.delete("/users/company/member/{user_id}")
def remove_company_member(
    user_id: int,
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Session = Depends(get_db)
):
    """Remove a member from company - Company users can remove members from their own company"""
    current_user = auth.get_current_user(token, db)
    
    # Only company users can remove members
    if current_user.role != "COMPANY":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only company users can manage company members"
        )
    
    # Get the user to remove
    user_to_remove = crud.get_user(db, user_id)
    if not user_to_remove:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Can't remove yourself
    if user_to_remove.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot remove yourself"
        )
    
    # Can only remove users from same company
    if user_to_remove.company_id != current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Can only remove members from your own company"
        )
    
    # Soft delete the user
    crud.update_user(db, user_id, {"status": "DELETED"})
    
    logger.info(f"Company user {current_user.id} removed member {user_id} from company {current_user.company_id}")
    
    return {"message": "Member removed successfully"}


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


@app.post("/me/profile-picture")
async def upload_profile_picture(
    file: UploadFile = File(...),
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """
    Upload a profile picture for the current user.
    Supports: jpg, jpeg, png, gif, webp
    Max size: 5MB
    Replaces old profile picture if exists.
    """
    current_user = auth.get_current_user(token, db)
    
    # Validate file extension
    allowed_ext = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
    file_ext = os.path.splitext(file.filename)[1].lower() if file.filename else ''
    if file_ext not in allowed_ext:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed types: {', '.join(allowed_ext)}"
        )
    
    # Read and check size
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File too large. Maximum size: 5MB"
        )
    
    # Delete old profile picture file if exists
    if current_user.image_url:
        old_filename = current_user.image_url.split("/")[-1]
        old_path = os.path.join(UPLOAD_DIR, old_filename)
        if os.path.exists(old_path):
            try:
                os.remove(old_path)
                logger.info(f"Deleted old profile picture: {old_filename}")
            except Exception as e:
                logger.warning(f"Could not delete old profile picture: {e}")
    
    # Save new profile picture
    unique_filename = f"profile_{current_user.id}_{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Update user's image_url in DB
    image_url = f"/api/auth/uploads/{unique_filename}"
    updated_user = crud.update_user_image(db, current_user.id, image_url)
    
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile picture"
        )
    
    logger.info(f"User {current_user.id} updated profile picture: {unique_filename}")
    
    return {
        "message": "Profile picture updated successfully",
        "image_url": image_url
    }


@app.delete("/me/profile-picture")
def delete_profile_picture(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Session = Depends(get_db)
):
    """Delete the current user's profile picture"""
    current_user = auth.get_current_user(token, db)
    
    if current_user.image_url:
        old_filename = current_user.image_url.split("/")[-1]
        old_path = os.path.join(UPLOAD_DIR, old_filename)
        if os.path.exists(old_path):
            try:
                os.remove(old_path)
            except Exception as e:
                logger.warning(f"Could not delete profile picture file: {e}")
        
        crud.update_user_image(db, current_user.id, None)
        logger.info(f"User {current_user.id} deleted profile picture")
    
    return {"message": "Profile picture deleted successfully"}


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


# ============ Internal Service-to-Service Endpoints ============
# These endpoints are for internal microservice communication only
# They should be protected by network isolation in production

@app.get("/internal/users/{user_id}", response_model=schemas.User)
def get_user_internal(
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    Internal endpoint for service-to-service communication.
    Returns user info without authentication.
    Should only be accessible within the Docker network.
    """
    user = crud.get_user(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user


# ============================================================
# DSGVO / GDPR — User Self-Service Endpoints
# ============================================================

def _call_service_delete(service_url: str, user_id: int) -> dict:
    """Call a service's internal delete endpoint"""
    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.delete(
                f"{service_url}/internal/user-data/{user_id}",
                headers={"X-Internal-Key": INTERNAL_API_KEY}
            )
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Service {service_url} returned {response.status_code} for user deletion")
                return {"error": f"HTTP {response.status_code}"}
    except Exception as e:
        logger.error(f"Failed to call {service_url} for user deletion: {e}")
        return {"error": str(e)}


def _call_service_export(service_url: str, user_id: int) -> dict:
    """Call a service's internal export endpoint"""
    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.get(
                f"{service_url}/internal/user-data/{user_id}/export",
                headers={"X-Internal-Key": INTERNAL_API_KEY}
            )
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Service {service_url} returned {response.status_code} for user export")
                return {"service": service_url, "error": f"HTTP {response.status_code}"}
    except Exception as e:
        logger.error(f"Failed to call {service_url} for user export: {e}")
        return {"service": service_url, "error": str(e)}


@app.get("/me/export")
def export_my_data(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Session = Depends(get_db)
):
    """
    DSGVO Art. 15/20 — Datenauskunft & Datenportabilität
    Exportiert alle personenbezogenen Daten des Benutzers als JSON.
    """
    user = auth.get_current_user(token, db)

    # 1. Auth-Service Daten (direkt aus DB)
    auth_data = {
        "service": "auth",
        "user_id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "phone": user.phone,
        "role": user.role,
        "language": user.language,
        "city": user.city,
        "district": user.district,
        "job_description": user.job_description,
        "total_points": user.total_points,
        "image_url": user.image_url,
        "status": user.status,
        "is_verified": user.is_verified,
        "last_login": user.last_login.isoformat() if user.last_login else None,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }

    # 2. Daten von anderen Services sammeln
    reporting_data = _call_service_export(REPORTING_SERVICE_URL, user.id)
    gamification_data = _call_service_export(GAMIFICATION_SERVICE_URL, user.id)
    coupons_data = _call_service_export(COUPONS_SERVICE_URL, user.id)
    notification_data = _call_service_export(NOTIFICATION_SERVICE_URL, user.id)

    logger.info(f"DSGVO: Data export for user {user.id} ({user.email})")

    return {
        "export_date": __import__("datetime").datetime.utcnow().isoformat(),
        "user": auth_data,
        "reports": reporting_data,
        "gamification": gamification_data,
        "coupons": coupons_data,
        "notifications": notification_data,
    }


@app.delete("/me")
def delete_my_account(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Session = Depends(get_db)
):
    """
    DSGVO Art. 17 — Recht auf Löschung (Right to Erasure)
    Löscht das Benutzerkonto und alle zugehörigen Daten in allen Services.
    Diese Aktion kann NICHT rückgängig gemacht werden.
    """
    user = auth.get_current_user(token, db)

    # Admins dürfen sich nicht selbst löschen (Sicherheit)
    if user.role == "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin accounts cannot be self-deleted. Contact another admin."
        )

    user_id = user.id
    user_email = user.email
    cascade_results = {}

    # 1. Kaskaden-Löschung in allen Services
    logger.info(f"DSGVO: Starting cascade deletion for user {user_id} ({user_email})")

    cascade_results["reporting"] = _call_service_delete(REPORTING_SERVICE_URL, user_id)
    cascade_results["gamification"] = _call_service_delete(GAMIFICATION_SERVICE_URL, user_id)
    cascade_results["coupons"] = _call_service_delete(COUPONS_SERVICE_URL, user_id)
    cascade_results["notifications"] = _call_service_delete(NOTIFICATION_SERVICE_URL, user_id)

    # 2. Refresh Tokens löschen
    db.query(models.RefreshToken).filter(
        models.RefreshToken.user_id == user_id
    ).delete()

    # 3. Profilbild löschen
    if user.image_url:
        filename = user.image_url.split("/")[-1]
        filepath = os.path.join(UPLOAD_DIR, filename)
        if os.path.exists(filepath):
            os.remove(filepath)

    # 4. User permanent aus DB löschen
    db.delete(user)
    db.commit()

    logger.info(f"DSGVO: User {user_id} ({user_email}) permanently deleted. "
                f"Cascade results: {cascade_results}")

    return {
        "message": "Account and all associated data permanently deleted",
        "user_id": user_id,
        "cascade_results": cascade_results,
    }
