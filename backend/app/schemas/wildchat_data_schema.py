from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class WildChatRecord(BaseModel):
    """Model for individual records from WildChat parquet data"""
    conversation_hash: str
    model: str
    timestamp: datetime
    conversation: str  # or List[str] if it's a list of messages
    turn: int
    language: str
    state: str
    country: str
    hashed_ip: str
    header: Optional[Dict[str, Any]] = None

    class Config:
        json_schema_extra = {
            "example": {
                "conversation_hash": "6f45c17632394b493f21821cfacbb395",
                "model": "gpt-4",
                "timestamp": "2024-01-15T10:30:00Z",
                "turn": 1,
                "language": "en",
                "state": "CA",
                "country": "US",
            }
        }


class WildChatFilter(BaseModel):
    """Filter parameters for querying WildChat data"""
    language: Optional[str] = None
    country: Optional[str] = None
    state: Optional[str] = None
    model: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None


class WildChatResponse(BaseModel):
    """API response for filtered WildChat data"""
    total_records: int
    records: List[WildChatRecord]