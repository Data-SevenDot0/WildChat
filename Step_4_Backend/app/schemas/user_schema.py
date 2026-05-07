from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    username: str
    email: str

class UserCreate(UserBase):
    password: str # Used for registration only

class User_schema(UserBase):
    user_id: int
    hashed_ip: Optional[str] = None
    histories: Optional[list] = None
    
    model_config = ConfigDict(from_attributes=True)