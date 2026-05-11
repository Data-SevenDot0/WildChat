from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import Optional
from app.models.tag import Tag, UserTagAssignment


def get_user_tags(db: Session, user_id: int) -> list[Tag]:
    return db.query(Tag).filter(Tag.user_id == user_id).all()


def get_tag(db: Session, tag_id: int, user_id: int) -> Optional[Tag]:
    return db.query(Tag).filter(Tag.tag_id == tag_id, Tag.user_id == user_id).first()


def create_tag(db: Session, user_id: int, name: str, color: str, keywords: list[str]) -> Tag:
    tag = Tag(name=name, color=color, keywords=",".join(keywords), user_id=user_id)
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


def update_tag(db: Session, tag: Tag, name: Optional[str], color: Optional[str], keywords: Optional[list[str]]) -> Tag:
    if name is not None:
        tag.name = name
    if color is not None:
        tag.color = color
    if keywords is not None:
        tag.keywords = ",".join(keywords)
    db.commit()
    db.refresh(tag)
    return tag


def delete_tag(db: Session, tag: Tag) -> None:
    db.delete(tag)
    db.commit()


def set_assignments(db: Session, tag_id: int, hashes: list[str]) -> int:
    """Replace all assignments for a tag with the given conversation hashes."""
    unique_hashes = list(dict.fromkeys(hashes))
    db.query(UserTagAssignment).filter(UserTagAssignment.tag_id == tag_id).delete()
    for h in unique_hashes:
        db.add(UserTagAssignment(tag_id=tag_id, conversation_hash=h))
    db.commit()
    return len(unique_hashes)


def get_assignment_hashes(db: Session, tag_id: int) -> list[str]:
    rows = db.query(UserTagAssignment.conversation_hash).filter(
        UserTagAssignment.tag_id == tag_id
    ).all()
    return [r[0] for r in rows]


def get_tags_for_conversation(db: Session, user_id: int, conversation_hash: str) -> list[Tag]:
    return (
        db.query(Tag)
        .join(UserTagAssignment, Tag.tag_id == UserTagAssignment.tag_id)
        .filter(Tag.user_id == user_id, UserTagAssignment.conversation_hash == conversation_hash)
        .all()
    )


def assignment_count(db: Session, tag_id: int) -> int:
    return db.query(UserTagAssignment).filter(UserTagAssignment.tag_id == tag_id).count()
