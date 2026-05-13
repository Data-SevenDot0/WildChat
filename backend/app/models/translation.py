from datetime import datetime
from typing import TYPE_CHECKING
from .base import Base

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, Text, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column, relationship


class Translation(Base):
    __tablename__ = "translation"

    translation_id: Mapped[int] = mapped_column(primary_key=True)
    conversation_hash: Mapped[str] = mapped_column(String(200), index=True)
    original_language: Mapped[str] = mapped_column(String(20))
    translated_content: Mapped[str] = mapped_column(Text)