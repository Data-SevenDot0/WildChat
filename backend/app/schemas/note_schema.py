from datetime import datetime

from pydantic import BaseModel, ConfigDict


class NoteCreate(BaseModel):
    content: str
    conversation_hash: str | None = None


class Note_schema(BaseModel):
    note_id: int
    user_id: int
    conversation_hash: str | None
    content: str
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)