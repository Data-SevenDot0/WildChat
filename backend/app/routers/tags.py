from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.crud import crud_tag
from app.db.session import get_db
from app.models.user import User
from app.schemas.tag_schema import TagOut, TagCreate, TagUpdate

tag_router = APIRouter(prefix="/tags", tags=["tags"])


def _parse_keywords(raw: str) -> list[str]:
    return [k.strip() for k in raw.split(",") if k.strip()]


def _match_keywords(keywords: list[str], db: Session) -> list[str]:
    """
    Find conversation hashes where any keyword matches model, language, country,
    or topic tags. Queries the wildchat_conversation Postgres table — no parquet
    scan, no warmup delay.

    Returns an empty list (with a logged warning) if the ETL hasn't finished yet.
    """
    from sqlalchemy import func, or_
    from app.models.wildchat_conversation import WildchatConversation
    from app.db.etl import etl_ready

    if not keywords:
        return []

    if not etl_ready.is_set():
        import logging
        logging.getLogger(__name__).warning(
            "Tag keyword matching requested before conversation ETL finished — "
            "returning empty. Try again in a moment or click Rematch once the "
            "server finishes loading."
        )
        return []

    conditions = []
    for kw in keywords:
        pat = f"%{kw.strip().lower()}%"
        conditions.extend([
            func.lower(WildchatConversation.model).like(pat),
            func.lower(WildchatConversation.language).like(pat),
            func.lower(WildchatConversation.country).like(pat),
            WildchatConversation.tags_text.like(pat),
        ])

    rows = (
        db.query(WildchatConversation.conversation_hash)
        .filter(or_(*conditions))
        .all()
    )
    return [r[0] for r in rows]


def _tag_to_out(tag, db: Session) -> TagOut:
    return TagOut(
        tag_id=tag.tag_id,
        name=tag.name,
        color=tag.color,
        keywords=_parse_keywords(tag.keywords or ""),
        match_count=crud_tag.assignment_count(db, tag.tag_id),
    )


# ── Endpoints ──────────────────────────────────────────────────────────────────

@tag_router.get("/", response_model=list[TagOut])
def list_tags(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tags = crud_tag.get_user_tags(db, current_user.user_id)
    return [_tag_to_out(t, db) for t in tags]


@tag_router.post("/", response_model=TagOut, status_code=status.HTTP_201_CREATED)
def create_tag(
    body: TagCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = crud_tag.get_user_tags(db, current_user.user_id)
    if any(t.name.lower() == body.name.strip().lower() for t in existing):
        raise HTTPException(status_code=400, detail="You already have a tag with that name.")

    tag = crud_tag.create_tag(
        db,
        user_id=current_user.user_id,
        name=body.name.strip(),
        color=body.color,
        keywords=body.keywords,
    )

    hashes = _match_keywords(body.keywords, db)
    crud_tag.set_assignments(db, tag.tag_id, hashes)

    return _tag_to_out(tag, db)


@tag_router.put("/{tag_id}", response_model=TagOut)
def update_tag(
    tag_id: int,
    body: TagUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tag = crud_tag.get_tag(db, tag_id, current_user.user_id)
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found.")

    if body.name is not None:
        existing = crud_tag.get_user_tags(db, current_user.user_id)
        if any(t.name.lower() == body.name.strip().lower() and t.tag_id != tag_id for t in existing):
            raise HTTPException(status_code=400, detail="You already have a tag with that name.")

    crud_tag.update_tag(db, tag, body.name, body.color, body.keywords)

    # Re-run matching whenever keywords change
    if body.keywords is not None:
        hashes = _match_keywords(body.keywords, db)
        crud_tag.set_assignments(db, tag_id, hashes)

    return _tag_to_out(tag, db)


@tag_router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tag(
    tag_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tag = crud_tag.get_tag(db, tag_id, current_user.user_id)
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found.")
    crud_tag.delete_tag(db, tag)


@tag_router.get("/{tag_id}/hashes", response_model=list[str])
def get_tag_hashes(
    tag_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tag = crud_tag.get_tag(db, tag_id, current_user.user_id)
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found.")
    return crud_tag.get_assignment_hashes(db, tag_id)


@tag_router.post("/{tag_id}/rematch", response_model=TagOut)
def rematch_tag(
    tag_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Re-run keyword matching for a tag. Useful when the text index wasn't ready at creation time."""
    tag = crud_tag.get_tag(db, tag_id, current_user.user_id)
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found.")
    keywords = _parse_keywords(tag.keywords or "")
    hashes = _match_keywords(keywords, db)
    crud_tag.set_assignments(db, tag_id, hashes)
    return _tag_to_out(tag, db)


@tag_router.get("/for-conversation/{conversation_hash}", response_model=list[TagOut])
def tags_for_conversation(
    conversation_hash: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tags = crud_tag.get_tags_for_conversation(db, current_user.user_id, conversation_hash)
    return [_tag_to_out(t, db) for t in tags]
