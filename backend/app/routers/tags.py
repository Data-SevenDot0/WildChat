from app.schemas.tag_schema import TagBase
from app.crud import crud_tag
from app.db.session import get_db
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import Optional

tag_router = APIRouter(prefix="/tags", tags=["tags"])

@tag_router.get("/{tag_id}", response_model=TagBase)
def get_tag(tag_id: int, db: Session = Depends(get_db)):
    tag_obj = crud_tag.get_tag(db, tag_id=tag_id)
    if tag_obj is None:
        raise HTTPException(status_code=404, detail="Tag not found")
    return tag_obj

@tag_router.post("/", response_model=TagBase, status_code=status.HTTP_201_CREATED)
def create_tag(name: str, keywords: Optional[str] = None, user_id: Optional[int] = None, db: Session = Depends(get_db)):
    """
    Create a new tag.
    - name: name of the tag (required)
    - keywords: comma-separated keywords associated with the tag (optional)
    - user_id: ID of the user creating the tag (optional)
    """
    existing_tag = crud_tag.get_tag_by_name(db, name=name)
    if existing_tag:
        raise HTTPException(status_code=400, detail="Tag with this name already exists")

    return crud_tag.create_tag(db, name=name, keywords=keywords, user_id=user_id)

@tag_router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tag(tag_id: int, db: Session = Depends(get_db)):
    success = crud_tag.delete_tag(db, tag_id=tag_id)
    if not success:
        raise HTTPException(status_code=404, detail="Tag not found")
    return None  # 204 No Content does not return a body