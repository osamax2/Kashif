"""
YOLOv8 Pothole Detection Service
Processes HEIC images, detects potholes, extracts GPS data, and creates reports
"""
import os
from datetime import datetime
from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql://postgres:postgres@localhost:5433/reporting_db"
    )
    
    # Service URLs
    REPORTING_SERVICE_URL: str = os.getenv(
        "REPORTING_SERVICE_URL",
        "http://localhost:8003"
    )
    AUTH_SERVICE_URL: str = os.getenv(
        "AUTH_SERVICE_URL",
        "http://localhost:8001"
    )
    
    # Image processing
    IMAGES_DIR: str = os.getenv("IMAGES_DIR", "/app/images")
    PROCESSED_DIR: str = os.getenv("PROCESSED_DIR", "/app/processed")
    OUTPUT_DIR: str = os.getenv("OUTPUT_DIR", "/app/output")
    
    # YOLOv8 Model
    MODEL_PATH: str = os.getenv("MODEL_PATH", "/app/models/pothole_model.pt")
    CONFIDENCE_THRESHOLD: float = float(os.getenv("CONFIDENCE_THRESHOLD", "0.5"))
    
    # Admin user for auto-reports
    ADMIN_USER_ID: int = int(os.getenv("ADMIN_USER_ID", "1"))
    
    # Processing settings
    PROCESS_INTERVAL_MINUTES: int = int(os.getenv("PROCESS_INTERVAL_MINUTES", "5"))
    AUTO_PROCESS_ENABLED: bool = os.getenv("AUTO_PROCESS_ENABLED", "true").lower() == "true"
    
    class Config:
        env_file = ".env"


settings = Settings()
