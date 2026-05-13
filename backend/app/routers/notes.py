from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.crud import crud_note
from app.db.session import get_db
from app.models.user import User
from app.schemas.note_schema import NoteCreate, Note_schema

note_router = APIRouter(prefix="/notes", tags=["notes"])


@note_router.get("/", response_model=list[Note_schema])
def get_notes(
    conversation_hash: str | None = None,
    limit: int = Query(500, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud_note.get_notes(db, current_user.user_id, conversation_hash=conversation_hash, limit=limit)


@note_router.post("/", response_model=Note_schema, status_code=status.HTTP_201_CREATED)
def create_note(
    data: NoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not data.content.strip():
        raise HTTPException(status_code=400, detail="Note content cannot be empty")
    return crud_note.create_note(db, current_user.user_id, data)


@note_router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    deleted = crud_note.delete_note(db, note_id, current_user.user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Note not found")