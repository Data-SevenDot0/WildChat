from pydantic import BaseModel, ConfigDict
from datetime import datetime


class HistoryCreate(BaseModel):
    search_query: str


class History_schema(BaseModel):
    history_id: int
    user_id: int
    search_query: str
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)