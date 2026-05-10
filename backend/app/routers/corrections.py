from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.topic_correction import TopicCorrection

corrections_router = APIRouter(prefix="/corrections", tags=["corrections"])

VALID_TOPICS = {
    "Coding / tech",
    "Writing",
    "Research / info",
    "Math / science",
    "Translation",
    "Other",
}


class CorrectionIn(BaseModel):
    conversation_hash: str
    corrected_topic: str
    original_topic: str | None = None


class CorrectionOut(BaseModel):
    id: int
    conversation_hash: str
    corrected_topic: str
    original_topic: str | None

    class Config:
        from_attributes = True


@corrections_router.get("/topic/{conversation_hash}", response_model=CorrectionOut | None)
def get_correction(conversation_hash: str, db: Session = Depends(get_db)):
    return db.query(TopicCorrection).filter(
        TopicCorrection.conversation_hash == conversation_hash
    ).first()


@corrections_router.post("/topic", response_model=CorrectionOut, status_code=status.HTTP_201_CREATED)
def set_correction(data: CorrectionIn, db: Session = Depends(get_db)):
    if data.corrected_topic not in VALID_TOPICS:
        raise HTTPException(status_code=400, detail=f"Invalid topic. Must be one of: {', '.join(sorted(VALID_TOPICS))}")

    existing = db.query(TopicCorrection).filter(
        TopicCorrection.conversation_hash == data.conversation_hash
    ).first()

    if existing:
        existing.corrected_topic = data.corrected_topic
        if data.original_topic is not None:
            existing.original_topic = data.original_topic
        db.commit()
        db.refresh(existing)
        return existing

    correction = TopicCorrection(
        conversation_hash=data.conversation_hash,
        corrected_topic=data.corrected_topic,
        original_topic=data.original_topic,
    )
    db.add(correction)
    db.commit()
    db.refresh(correction)
    return correction


@corrections_router.delete("/topic/{conversation_hash}", status_code=status.HTTP_204_NO_CONTENT)
def delete_correction(conversation_hash: str, db: Session = Depends(get_db)):
    correction = db.query(TopicCorrection).filter(
        TopicCorrection.conversation_hash == conversation_hash
    ).first()
    if not correction:
        raise HTTPException(status_code=404, detail="No correction found for this conversation")
    db.delete(correction)
    db.commit()
