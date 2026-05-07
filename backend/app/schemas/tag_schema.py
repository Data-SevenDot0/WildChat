from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class TagBase(BaseModel):
    tag_id: int
    name: str
    keywords: Optional[str] = None  # Comma-separated keywords
    
    model_config = ConfigDict(from_attributes=True)