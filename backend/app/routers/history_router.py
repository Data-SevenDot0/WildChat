from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.crud import crud_history
from app.db.session import get_db
from app.models.user import User
from app.schemas.history_schema import History_schema, HistoryCreate

history_router = APIRouter(prefix="/history", tags=["history"])


@history_router.get("/", response_model=list[History_schema])
def get_history(
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return the authenticated user's history only."""
    return crud_history.get_history(db, current_user.user_id, limit=limit)


@history_router.post("/", response_model=History_schema, status_code=status.HTTP_201_CREATED)
def create_history(
    data: HistoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Save a history entry for the authenticated user."""
    if not data.search_query.strip():
        raise HTTPException(status_code=400, detail="search_query cannot be empty")
    return crud_history.create_history(db, current_user.user_id, data)


@history_router.delete("/", status_code=status.HTTP_204_NO_CONTENT)
def clear_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Clear all history for the authenticated user."""
    crud_history.clear_history(db, current_user.user_id)


@history_router.delete("/{history_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_history(
    history_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a single history entry — only if it belongs to the current user."""
    deleted = crud_history.delete_history(db, history_id, current_user.user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="History entry not found")