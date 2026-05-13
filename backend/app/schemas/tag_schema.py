from pydantic import BaseModel, ConfigDict
from typing import Optional


class TagOut(BaseModel):
    tag_id: int
    name: str
    color: str
    keywords: list[str]
    match_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class TagCreate(BaseModel):
    name: str
    color: str = "#6366f1"
    keywords: list[str] = []


class TagUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    keywords: Optional[list[str]] = None


# Keep old name for backward compat
class TagBase(BaseModel):
    tag_id: int
    name: str
    keywords: Optional[str] = None
    user_id: int

    model_config = ConfigDict(from_attributes=True)
