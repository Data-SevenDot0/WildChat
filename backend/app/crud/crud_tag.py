from sqlalchemy.orm import Session
from app.models import tag
from app.core.security import verify_password, get_password_hash
from typing import Optional
from app.schemas.tag_schema import TagBase
from app.models.tag import Tag

def get_tag(db: Session, tag_id: int):
        tag = db.query(Tag).filter(Tag.tag_id == tag_id).first()
        return tag

def create_tag(db: Session, name: str, keywords: Optional[str] = None):
    tag = Tag(name=name, keywords=keywords)
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag

def delete_tag(db: Session, tag_id: int):
    tag = db.query(Tag).filter(Tag.tag_id == tag_id).first()
    if tag:
        db.delete(tag)
        db.commit()
        return True
    return False

def get_tag_by_name(db: Session, name: str):
    tag = db.query(Tag).filter(Tag.name == name).first()
    return tag