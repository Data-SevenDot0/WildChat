from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class TranslationBase(BaseModel):
    translation_id: int
    conversation_hash: str
    original_language: str
    translated_content: str
    
    model_config = ConfigDict(from_attributes=True)