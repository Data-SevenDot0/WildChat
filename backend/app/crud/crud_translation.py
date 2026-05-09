from sqlalchemy.orm import Session
from app.models.translation import Translation


def get_translation(db: Session, conversation_hash: str):
    return db.query(Translation).filter(Translation.conversation_hash == conversation_hash).first()


def create_translation(db: Session, conversation_hash: str, original_language: str, translated_content: str):
    translation = Translation(
        conversation_hash=conversation_hash,
        original_language=original_language,
        translated_content=translated_content,
    )
    db.add(translation)
    db.commit()
    db.refresh(translation)
    return translation