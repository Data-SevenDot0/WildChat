from app.schemas.translation_schema import TranslationBase
from app.crud import crud_translation
from app.db.session import get_db
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

translation_router = APIRouter(prefix="/translations", tags=["translations"])

@translation_router.get("/{conversation_hash}", response_model=TranslationBase)
def read_translation(conversation_hash: str, db: Session = Depends(get_db)):
    translation = crud_translation.get_translation(db, conversation_hash=conversation_hash)
    if not translation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Translation not found")
    return translation

@translation_router.post("/{conversation_hash}", response_model=TranslationBase)
def create_translation(conversation_hash: str, translation_text: str, db: Session = Depends(get_db)):
    translation = crud_translation.create_translation(db, conversation_hash=conversation_hash, translation_text=translation_text)
    return translation