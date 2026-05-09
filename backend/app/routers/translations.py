import json
from deep_translator import GoogleTranslator
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.crud import crud_translation
from app.db.session import get_db
from app.schemas.translation_schema import TranslationBase

translation_router = APIRouter(prefix="/translations", tags=["translations"])


class TranslationRequest(BaseModel):
    messages: list[dict]       # [{"role": "...", "content": "..."}, ...]
    source_language: str


@translation_router.get("/{conversation_hash}", response_model=TranslationBase)
def read_translation(conversation_hash: str, db: Session = Depends(get_db)):
    translation = crud_translation.get_translation(db, conversation_hash=conversation_hash)
    if not translation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Translation not found")
    return translation


@translation_router.post("/{conversation_hash}", response_model=TranslationBase)
def get_or_create_translation(
    conversation_hash: str,
    body: TranslationRequest,
    db: Session = Depends(get_db),
):
    # 1. Cache hit — return immediately, no API call
    cached = crud_translation.get_translation(db, conversation_hash=conversation_hash)
    if cached:
        return cached

    # 2. Cache miss — translate each message and save
    translator = GoogleTranslator(source="auto", target="en")
    translated_messages = []
    failed = []

    for msg in body.messages:
        content = msg.get("content") or ""
        try:
            translated = translator.translate(content[:4999]) if content.strip() else content
        except Exception as exc:
            translated = content          # keep original rather than silently drop
            failed.append(str(exc))
        translated_messages.append({"role": msg.get("role"), "content": translated})

    if failed:
        # Surface failures in the response header so the frontend can warn the user
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Translation failed for {len(failed)} message(s): {failed[0]}",
        )

    # 3. Save to database
    translation = crud_translation.create_translation(
        db,
        conversation_hash=conversation_hash,
        original_language=body.source_language,
        translated_content=json.dumps(translated_messages),
    )
    return translation