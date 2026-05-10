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
    Find conversation_hashes whose metadata matches any of the given keywords.

    Searches (case-insensitive substring) across:
      - existing topic tags  (the 'tags' column from tagger.py)
      - country, language, model  (all already in the in-memory slim DataFrame)

    All data is in-memory so this runs in ~1-3 s for 838 K rows.
    """
    # Import here to avoid circular imports; _load_df is cached after first call
    from app.routers.wildchat_data import _load_df
    import pandas as pd

    if not keywords:
        return []

    df = _load_df()
    combined_mask = pd.Series(False, index=df.index)

    for kw in keywords:
        kw_lower = kw.lower().strip()
        if not kw_lower:
            continue

        # Existing topic tags — stored as a Python list per row
        def _tag_hit(tags):
            if not tags:
                return False
            if isinstance(tags, list):
                return any(kw_lower in str(t).lower() for t in tags)
            return kw_lower in str(tags).lower()

        tag_mask = df["tags"].apply(_tag_hit)

        country_mask  = df["country"].str.lower().str.contains(kw_lower, na=False, regex=False)
        language_mask = df["language"].str.lower().str.contains(kw_lower, na=False, regex=False)
        model_mask    = df["model"].str.lower().str.contains(kw_lower, na=False, regex=False)

        combined_mask |= tag_mask | country_mask | language_mask | model_mask

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
