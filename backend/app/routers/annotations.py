from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.crud import crud_annotation
from app.db.session import get_db
from app.models.user import User
from app.schemas.annotation_schema import Annotation_schema, AnnotationCreate

annotation_router = APIRouter(prefix="/annotations", tags=["annotations"])


@annotation_router.get("/{conversation_hash}", response_model=list[Annotation_schema])
def get_annotations(
    conversation_hash: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud_annotation.get_annotations(db, current_user.user_id, conversation_hash)


@annotation_router.post("/", response_model=Annotation_schema, status_code=status.HTTP_201_CREATED)
def create_annotation(
    data: AnnotationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not data.text.strip():
        raise HTTPException(status_code=400, detail="Annotation text cannot be empty")
    return crud_annotation.create_annotation(db, current_user.user_id, data)


@annotation_router.delete("/{annotation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_annotation(
    annotation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    deleted = crud_annotation.delete_annotation(db, annotation_id, current_user.user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Annotation not found")
