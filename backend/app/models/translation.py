from datetime import datetime
from typing import TYPE_CHECKING
from .base import Base

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column
from .base import Base


class Translation(Base):
    __tablename__ = "translation"

    translation_id: Mapped[int] = mapped_column(primary_key=True)
    conversation_hash: Mapped[str] = mapped_column(String(200), index=True)
    original_language: Mapped[str] = mapped_column(String(50))
    translated_content: Mapped[str] = mapped_column(Text)