from sqlalchemy.orm import Session
from app.models import translation
from app.core.security import verify_password, get_password_hash
from typing import Optional
from app.schemas.translation_schema import TranslationBase
from app.models.translation import Translation

def get_translation(db: Session, conversation_hash: str):
        translation = db.query(Translation).filter(Translation.conversation_hash == conversation_hash).first()
        return translation

def create_translation(db: Session, conversation_hash: str, translation_text: str):
    translation = Translation(conversation_hash=conversation_hash, translation_text=translation_text)
    db.add(translation)
    db.commit()
    db.refresh(translation)
    return translation