from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
import models
import schemas


def create_transaction(
    db: Session,
    user_id: int,
    points: int,
    transaction_type: str,
    report_id: Optional[int],
    description: Optional[str]
):
    """Create a new point transaction"""
    transaction = models.PointTransaction(
        user_id=user_id,
        points=points,
        type=transaction_type,
        report_id=report_id,
        description=description
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction


def get_user_total_points(db: Session, user_id: int) -> int:
    """Calculate total points for a user"""
    result = db.query(func.sum(models.PointTransaction.points)).filter(
        models.PointTransaction.user_id == user_id
    ).scalar()
    return result if result else 0


def get_user_transactions(
    db: Session,
    user_id: int,
    skip: int = 0,
    limit: int = 100
) -> List[models.PointTransaction]:
    """Get user's transaction history"""
    return db.query(models.PointTransaction).filter(
        models.PointTransaction.user_id == user_id
    ).order_by(models.PointTransaction.created_at.desc()).offset(skip).limit(limit).all()


def get_leaderboard(db: Session, limit: int = 100) -> List[dict]:
    """Get top users by points"""
    results = db.query(
        models.PointTransaction.user_id,
        func.sum(models.PointTransaction.points).label('total_points')
    ).group_by(
        models.PointTransaction.user_id
    ).order_by(
        func.sum(models.PointTransaction.points).desc()
    ).limit(limit).all()
    
    leaderboard = []
    for rank, (user_id, total_points) in enumerate(results, start=1):
        leaderboard.append({
            "user_id": user_id,
            "total_points": total_points,
            "rank": rank
        })
    
    return leaderboard
