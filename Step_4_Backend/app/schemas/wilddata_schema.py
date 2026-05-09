from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class HeaderInfo(BaseModel):
    """Header information within a message"""
    accept_language: Optional[str] = Field(None, alias="accept-language")
    user_agent: Optional[str] = Field(None, alias="user-agent")
    
    class Config:
        populate_by_name = True


class ConversationMessage(BaseModel):
    """Individual message in a conversation"""
    content: Optional[str] = None
    country: Optional[str] = None
    hashed_ip: Optional[str] = None
    header: Optional[HeaderInfo] = None
    language: Optional[str] = None
    redacted: Optional[bool] = None
    role: Optional[str] = None
    state: Optional[str] = None
    timestamp: Optional[datetime] = None
    toxic: Optional[bool] = None
    turn_identifier: Optional[int] = None


class WildChatRecord(BaseModel):
    """Model for individual records from WildChat parquet data"""
    conversation_hash: Optional[str] = None
    model: Optional[str] = None
    timestamp: Optional[datetime] = None
    conversation: Optional[List[ConversationMessage]] = None
    turn: Optional[int] = None
    language: Optional[str] = None
    toxic: Optional[bool] = None
    redacted: Optional[bool] = None
    state: Optional[str] = None
    country: Optional[str] = None
    hashed_ip: Optional[str] = None
    header: Optional[HeaderInfo] = None


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