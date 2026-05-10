from datetime import datetime
from .base import Base
from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column


class TopicCorrection(Base):
    __tablename__ = "topic_correction"

    id: Mapped[int] = mapped_column(primary_key=True)
    conversation_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    corrected_topic: Mapped[str] = mapped_column(String(100))  # category name, e.g. "Research / info"
    original_topic: Mapped[str | None] = mapped_column(String(500), nullable=True)  # original tags JSON for reference
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
