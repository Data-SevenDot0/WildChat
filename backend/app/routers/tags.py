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


def _match_keywords(keywords: list[str]) -> list[str]:
    """
    Find conversation_hashes that whole-word match any keyword across:
      - conversation text (all message content, joined)
      - existing topic tags, country, language, model (metadata columns)

    Conversation text index is built lazily on first call (~30-60 s) then cached.
    Subsequent calls are fast (in-memory regex over cached text).
    """
    from app.routers.wildchat_data import _load_df, _get_text_index
    import json as _json
    import re as _re
    import pandas as pd

    if not keywords:
        return []

    df = _load_df()
    text_index = _get_text_index()
    combined_mask = pd.Series(False, index=df.index)

    # Compile all patterns up front
    compiled = []
    for kw in keywords:
        kw_lower = kw.lower().strip()
        if kw_lower:
            compiled.append((kw_lower, _re.compile(r"\b" + _re.escape(kw_lower) + r"\b")))

    for kw_lower, pattern in compiled:
        # ── Conversation text ────────────────────────────────────────────────
        text_hits = {h for h, text in text_index.items() if pattern.search(text)}
        text_mask = df["conversation_hash"].isin(text_hits)

        # ── Topic tags (JSON-parsed, whole-word per tag name) ────────────────
        def _tag_hit(tags_val, p=pattern):
            if not tags_val:
                return False
            try:
                tag_list = _json.loads(tags_val) if isinstance(tags_val, str) else tags_val
                return any(p.search(str(t).lower()) for t in tag_list)
            except Exception:
                return bool(p.search(str(tags_val).lower()))

        tag_mask      = df["tags"].apply(_tag_hit)
        country_mask  = df["country"].str.contains(pattern.pattern, na=False, regex=True, case=False)
        language_mask = df["language"].str.contains(pattern.pattern, na=False, regex=True, case=False)
        model_mask    = df["model"].str.contains(pattern.pattern, na=False, regex=True, case=False)

        combined_mask |= text_mask | tag_mask | country_mask | language_mask | model_mask

    return df.loc[combined_mask, "conversation_hash"].tolist()


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

    hashes = _match_keywords(body.keywords)
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
        hashes = _match_keywords(body.keywords)
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


@tag_router.get("/for-conversation/{conversation_hash}", response_model=list[TagOut])
def tags_for_conversation(
    conversation_hash: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tags = crud_tag.get_tags_for_conversation(db, current_user.user_id, conversation_hash)
    return [_tag_to_out(t, db) for t in tags]
