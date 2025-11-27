import logging
from typing import Annotated

import auth
import crud
import models
import schemas
from database import engine, get_db
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from rabbitmq_publisher import publish_event
from sqlalchemy.orm import Session

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Auth Service")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


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
    
    # Create user
    new_user = crud.create_user(db=db, user=user)
    
    # Publish UserRegistered event
    try:
        publish_event("user.registered", {
            "user_id": new_user.id,
            "email": new_user.email,
            "full_name": new_user.full_name,
            "role": new_user.role
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
    
    access_token = auth.create_access_token(data={"sub": user.email, "user_id": user.id})
    refresh_token = auth.create_refresh_token(data={"sub": user.email, "user_id": user.id})
    
    # Save access token and refresh token to database
    crud.update_user_access_token(db, user.id, access_token)
    crud.create_refresh_token(db, user.id, refresh_token)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
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


@app.post("/logout")
def logout(
    token_data: schemas.RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    crud.revoke_refresh_token(db, token_data.refresh_token)
    return {"message": "Logged out successfully"}


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
    return user
