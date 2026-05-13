from sqlalchemy import Boolean, DateTime, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from .base import Base


class WildchatConversation(Base):
    __tablename__ = "wildchat_conversation"

    conversation_hash: Mapped[str] = mapped_column(String(200), primary_key=True)
    model: Mapped[str] = mapped_column(String(100), default="")
    language: Mapped[str] = mapped_column(String(100), default="")
    country: Mapped[str] = mapped_column(String(100), default="")
    state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    turn_count: Mapped[int] = mapped_column(Integer, default=0)
    timestamp: Mapped[str | None] = mapped_column(DateTime, nullable=True)
    redacted: Mapped[bool] = mapped_column(Boolean, default=False)
    toxic: Mapped[bool] = mapped_column(Boolean, default=False)
    # Space-joined lowercase topic tags, e.g. "python code data science ml ai"
    tags_text: Mapped[str] = mapped_column(Text, default="")

    __table_args__ = (
        Index("ix_wc_model", "model"),
        Index("ix_wc_language", "language"),
        Index("ix_wc_country", "country"),
    )
