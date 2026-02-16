from typing import List, Optional

import models
import schemas
from sqlalchemy import func
from sqlalchemy.orm import Session


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


def get_confirmation_transaction(
    db: Session,
    user_id: int,
    report_id: int
) -> Optional[models.PointTransaction]:
    """Check if user already confirmed this report"""
    return db.query(models.PointTransaction).filter(
        models.PointTransaction.user_id == user_id,
        models.PointTransaction.report_id == report_id,
        models.PointTransaction.type == "REPORT_CONFIRMED"
    ).first()


# ── Achievement CRUD ─────────────────────────────────────────────────

def get_all_achievements(db: Session) -> List[models.Achievement]:
    """Get all active achievements"""
    return db.query(models.Achievement).filter(
        models.Achievement.is_active == True
    ).order_by(models.Achievement.id).all()


def get_user_achievements(db: Session, user_id: int) -> List[models.UserAchievement]:
    """Get all achievements unlocked by a user"""
    return db.query(models.UserAchievement).filter(
        models.UserAchievement.user_id == user_id
    ).order_by(models.UserAchievement.unlocked_at.desc()).all()


def get_user_achievement_ids(db: Session, user_id: int) -> set:
    """Get set of achievement IDs already unlocked by user"""
    results = db.query(models.UserAchievement.achievement_id).filter(
        models.UserAchievement.user_id == user_id
    ).all()
    return {r[0] for r in results}


def unlock_achievement(db: Session, user_id: int, achievement_id: int) -> models.UserAchievement:
    """Unlock an achievement for a user"""
    ua = models.UserAchievement(user_id=user_id, achievement_id=achievement_id)
    db.add(ua)
    db.commit()
    db.refresh(ua)
    return ua


def get_user_report_count(db: Session, user_id: int) -> int:
    """Count reports created by user (from point transactions)"""
    return db.query(models.PointTransaction).filter(
        models.PointTransaction.user_id == user_id,
        models.PointTransaction.type.in_(["REPORT_CREATED", "report_created"])
    ).count()


def get_user_confirm_count(db: Session, user_id: int) -> int:
    """Count confirmations by user"""
    return db.query(models.PointTransaction).filter(
        models.PointTransaction.user_id == user_id,
        models.PointTransaction.type == "REPORT_CONFIRMED"
    ).count()


def get_user_night_report_count(db: Session, user_id: int) -> int:
    """Count reports created between 22:00 and 06:00"""
    from sqlalchemy import extract
    return db.query(models.PointTransaction).filter(
        models.PointTransaction.user_id == user_id,
        models.PointTransaction.type.in_(["REPORT_CREATED", "report_created"]),
        (extract('hour', models.PointTransaction.created_at) >= 22) |
        (extract('hour', models.PointTransaction.created_at) < 6)
    ).count()


def get_user_pothole_report_count(db: Session, user_id: int) -> int:
    """Count pothole reports (category_id approximated via description/type)"""
    # Since we store report_id, we count transactions with type REPORT_CREATED
    # Pothole detection is done by checking description or separate tracking
    # For now, count all reports as potential potholes (simplified)
    return db.query(models.PointTransaction).filter(
        models.PointTransaction.user_id == user_id,
        models.PointTransaction.type.in_(["REPORT_CREATED", "report_created"]),
        models.PointTransaction.description.ilike("%pothole%") |
        models.PointTransaction.description.ilike("%حفرة%")
    ).count()


def check_and_unlock_achievements(db: Session, user_id: int) -> List[models.Achievement]:
    """Check all achievements and unlock any newly earned ones"""
    achievements = get_all_achievements(db)
    already_unlocked = get_user_achievement_ids(db, user_id)
    
    # Gather user stats
    report_count = get_user_report_count(db, user_id)
    confirm_count = get_user_confirm_count(db, user_id)
    night_count = get_user_night_report_count(db, user_id)
    pothole_count = get_user_pothole_report_count(db, user_id)
    total_points = get_user_total_points(db, user_id)
    
    newly_unlocked = []
    
    for achievement in achievements:
        if achievement.id in already_unlocked:
            continue
        
        earned = False
        ct = achievement.condition_type
        cv = achievement.condition_value
        
        if ct == "report_count" and report_count >= cv:
            earned = True
        elif ct == "confirm_count" and confirm_count >= cv:
            earned = True
        elif ct == "night_report" and night_count >= cv:
            earned = True
        elif ct == "pothole_count" and pothole_count >= cv:
            earned = True
        elif ct == "points_total" and total_points >= cv:
            earned = True
        
        if earned:
            unlock_achievement(db, user_id, achievement.id)
            newly_unlocked.append(achievement)
            
            # Award bonus points if any
            if achievement.points_reward > 0:
                create_transaction(
                    db=db,
                    user_id=user_id,
                    points=achievement.points_reward,
                    transaction_type="achievement_bonus",
                    report_id=None,
                    description=f"Achievement unlocked: {achievement.name_en}"
                )
    
    return newly_unlocked
