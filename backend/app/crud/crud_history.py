from sqlalchemy.orm import Session
from app.models.history import History
from app.schemas.history_schema import HistoryCreate


def get_history(db: Session, user_id: int, limit: int = 100) -> list[History]:
    """Return history entries for a specific user only, newest first."""
    return (
        db.query(History)
        .filter(History.user_id == user_id)
        .order_by(History.timestamp.desc())
        .limit(limit)
        .all()
    )


def create_history(db: Session, user_id: int, data: HistoryCreate) -> History:
    """Create a history entry scoped to the given user."""
    entry = History(user_id=user_id, search_query=data.search_query)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def delete_history(db: Session, history_id: int, user_id: int) -> bool:
    """Delete a history entry only if it belongs to the requesting user."""
    entry = (
        db.query(History)
        .filter(History.history_id == history_id, History.user_id == user_id)
        .first()
    )
    if not entry:
        return False
    db.delete(entry)
    db.commit()
    return True


def clear_history(db: Session, user_id: int) -> int:
    """Delete all history for a user. Returns number of rows deleted."""
    deleted = (
        db.query(History)
        .filter(History.user_id == user_id)
        .delete()
    )
    db.commit()
    return deleted