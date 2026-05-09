from sqlalchemy.orm import Session
from app.models.annotation import Annotation
from app.schemas.annotation_schema import AnnotationCreate


def get_annotations(db: Session, user_id: int, conversation_hash: str) -> list[Annotation]:
    return (
        db.query(Annotation)
        .filter(Annotation.user_id == user_id, Annotation.conversation_hash == conversation_hash)
        .order_by(Annotation.created_at)
        .all()
    )


def create_annotation(db: Session, user_id: int, data: AnnotationCreate) -> Annotation:
    annotation = Annotation(
        user_id=user_id,
        conversation_hash=data.conversation_hash,
        text=data.text.strip(),
    )
    db.add(annotation)
    db.commit()
    db.refresh(annotation)
    return annotation


def delete_annotation(db: Session, annotation_id: int, user_id: int) -> bool:
    annotation = db.query(Annotation).filter(
        Annotation.id == annotation_id,
        Annotation.user_id == user_id,
    ).first()
    if not annotation:
        return False
    db.delete(annotation)
    db.commit()
    return True
