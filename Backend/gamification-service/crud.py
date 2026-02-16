from typing import List, Optional

import models
import schemas
from datetime import datetime
from sqlalchemy import func, and_, or_
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


# ── Weekly Challenges CRUD ───────────────────────────────────────────

def get_active_challenges(db: Session) -> List[models.WeeklyChallenge]:
    """Get currently active weekly challenges"""
    now = datetime.utcnow()
    return db.query(models.WeeklyChallenge).filter(
        models.WeeklyChallenge.is_active == True,
        models.WeeklyChallenge.week_start <= now,
        models.WeeklyChallenge.week_end >= now,
    ).order_by(models.WeeklyChallenge.id).all()


def get_user_challenge_progress(db: Session, user_id: int, challenge_id: int) -> Optional[models.UserChallengeProgress]:
    """Get user's progress for a specific challenge"""
    return db.query(models.UserChallengeProgress).filter(
        models.UserChallengeProgress.user_id == user_id,
        models.UserChallengeProgress.challenge_id == challenge_id,
    ).first()


def get_or_create_progress(db: Session, user_id: int, challenge_id: int) -> models.UserChallengeProgress:
    """Get or create challenge progress record"""
    progress = get_user_challenge_progress(db, user_id, challenge_id)
    if not progress:
        progress = models.UserChallengeProgress(
            user_id=user_id,
            challenge_id=challenge_id,
            current_value=0,
            completed=False,
        )
        db.add(progress)
        db.commit()
        db.refresh(progress)
    return progress


def get_user_weekly_stats(db: Session, user_id: int, week_start: datetime, week_end: datetime) -> dict:
    """Get user stats for a specific week period"""
    report_count = db.query(models.PointTransaction).filter(
        models.PointTransaction.user_id == user_id,
        models.PointTransaction.type.in_(["REPORT_CREATED", "report_created"]),
        models.PointTransaction.created_at >= week_start,
        models.PointTransaction.created_at <= week_end,
    ).count()

    confirm_count = db.query(models.PointTransaction).filter(
        models.PointTransaction.user_id == user_id,
        models.PointTransaction.type == "REPORT_CONFIRMED",
        models.PointTransaction.created_at >= week_start,
        models.PointTransaction.created_at <= week_end,
    ).count()

    points_earned = db.query(func.coalesce(func.sum(models.PointTransaction.points), 0)).filter(
        models.PointTransaction.user_id == user_id,
        models.PointTransaction.points > 0,
        models.PointTransaction.created_at >= week_start,
        models.PointTransaction.created_at <= week_end,
    ).scalar()

    return {
        "report_count": report_count,
        "confirm_count": confirm_count,
        "points_earned": points_earned or 0,
    }


def check_and_complete_challenges(db: Session, user_id: int) -> List[models.WeeklyChallenge]:
    """Check active challenges and mark newly completed ones"""
    challenges = get_active_challenges(db)
    newly_completed = []

    for challenge in challenges:
        progress = get_or_create_progress(db, user_id, challenge.id)
        if progress.completed:
            continue

        # Get weekly stats
        stats = get_user_weekly_stats(db, user_id, challenge.week_start, challenge.week_end)

        # Determine current value based on condition type
        current = 0
        ct = challenge.condition_type
        if ct == "report_count":
            current = stats["report_count"]
        elif ct == "confirm_count":
            current = stats["confirm_count"]
        elif ct == "points_earned":
            current = stats["points_earned"]

        # Update progress
        progress.current_value = current
        if current >= challenge.target_value and not progress.completed:
            progress.completed = True
            progress.completed_at = datetime.utcnow()
            newly_completed.append(challenge)

            # Award bonus points
            if challenge.bonus_points > 0:
                create_transaction(
                    db=db,
                    user_id=user_id,
                    points=challenge.bonus_points,
                    transaction_type="challenge_bonus",
                    report_id=None,
                    description=f"Weekly challenge completed: {challenge.title_en}"
                )

        db.commit()

    return newly_completed


# ── Friends / Social CRUD ────────────────────────────────────────────

def send_friend_request(db: Session, user_id: int, friend_id: int) -> models.Friendship:
    """Send a friend request"""
    # Check if friendship already exists in either direction
    existing = db.query(models.Friendship).filter(
        or_(
            and_(models.Friendship.user_id == user_id, models.Friendship.friend_id == friend_id),
            and_(models.Friendship.user_id == friend_id, models.Friendship.friend_id == user_id),
        )
    ).first()
    if existing:
        return existing

    friendship = models.Friendship(user_id=user_id, friend_id=friend_id, status="pending")
    db.add(friendship)
    db.commit()
    db.refresh(friendship)
    return friendship


def accept_friend_request(db: Session, friendship_id: int, user_id: int) -> Optional[models.Friendship]:
    """Accept incoming friend request (only the recipient can accept)"""
    friendship = db.query(models.Friendship).filter(
        models.Friendship.id == friendship_id,
        models.Friendship.friend_id == user_id,
        models.Friendship.status == "pending",
    ).first()
    if friendship:
        friendship.status = "accepted"
        db.commit()
        db.refresh(friendship)
    return friendship


def reject_friend_request(db: Session, friendship_id: int, user_id: int) -> Optional[models.Friendship]:
    """Reject or remove a friend request"""
    friendship = db.query(models.Friendship).filter(
        models.Friendship.id == friendship_id,
        or_(
            models.Friendship.user_id == user_id,
            models.Friendship.friend_id == user_id,
        ),
    ).first()
    if friendship:
        db.delete(friendship)
        db.commit()
    return friendship


def get_friends(db: Session, user_id: int) -> List[models.Friendship]:
    """Get all accepted friendships for a user"""
    return db.query(models.Friendship).filter(
        or_(
            and_(models.Friendship.user_id == user_id, models.Friendship.status == "accepted"),
            and_(models.Friendship.friend_id == user_id, models.Friendship.status == "accepted"),
        )
    ).order_by(models.Friendship.created_at.desc()).all()


def get_pending_requests(db: Session, user_id: int) -> List[models.Friendship]:
    """Get pending friend requests for user (incoming)"""
    return db.query(models.Friendship).filter(
        models.Friendship.friend_id == user_id,
        models.Friendship.status == "pending",
    ).order_by(models.Friendship.created_at.desc()).all()


def get_friend_ids(db: Session, user_id: int) -> List[int]:
    """Get list of friend user IDs"""
    friendships = get_friends(db, user_id)
    friend_ids = []
    for f in friendships:
        if f.user_id == user_id:
            friend_ids.append(f.friend_id)
        else:
            friend_ids.append(f.user_id)
    return friend_ids


def get_friend_leaderboard(db: Session, user_id: int) -> List[dict]:
    """Get leaderboard only among friends (+ self)"""
    friend_ids = get_friend_ids(db, user_id)
    friend_ids.append(user_id)  # Include self

    results = db.query(
        models.PointTransaction.user_id,
        func.sum(models.PointTransaction.points).label("total_points"),
    ).filter(
        models.PointTransaction.user_id.in_(friend_ids)
    ).group_by(
        models.PointTransaction.user_id
    ).order_by(
        func.sum(models.PointTransaction.points).desc()
    ).all()

    leaderboard = []
    for rank, (uid, total_points) in enumerate(results, start=1):
        leaderboard.append({
            "user_id": uid,
            "total_points": total_points or 0,
            "rank": rank,
        })

    return leaderboard

