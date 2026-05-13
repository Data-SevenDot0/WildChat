from pydantic import BaseModel, ConfigDict
from datetime import datetime


class AnnotationCreate(BaseModel):
    conversation_hash: str
    text: str


class Annotation_schema(BaseModel):
    id: int
    user_id: int
    conversation_hash: str
    text: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
