from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class PointTransaction(Base):
    __tablename__ = "point_transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    report_id = Column(Integer, nullable=True)  # Foreign key to reports if applicable
    type = Column(String(50), nullable=False)  # REPORT_CREATED, CONFIRMATION, REDEMPTION, etc.
    points = Column(Integer, nullable=False)  # Positive for earning, negative for spending
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True, nullable=False)
