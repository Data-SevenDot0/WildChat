from sqlalchemy.orm import Session

from app.models.note import Note
from app.schemas.note_schema import NoteCreate


def get_notes(db: Session, user_id: int, conversation_hash: str | None = None, limit: int = 500) -> list[Note]:
    query = db.query(Note).filter(Note.user_id == user_id)
    if conversation_hash is not None:
        query = query.filter(Note.conversation_hash == conversation_hash)
    return query.order_by(Note.created_at.desc(), Note.note_id.desc()).limit(limit).all()


def create_note(db: Session, user_id: int, data: NoteCreate) -> Note:
    note = Note(
        user_id=user_id,
        conversation_hash=data.conversation_hash or None,
        content=data.content.strip(),
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


def delete_note(db: Session, note_id: int, user_id: int) -> bool:
    note = db.query(Note).filter(Note.note_id == note_id, Note.user_id == user_id).first()
    if not note:
        return False
    db.delete(note)
    db.commit()
    return True