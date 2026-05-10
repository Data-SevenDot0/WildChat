from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from .base import Base


class Tag(Base):
    __tablename__ = "tag"

    tag_id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50), index=True)
    color: Mapped[str] = mapped_column(String(20), default="#6366f1")
    keywords: Mapped[str] = mapped_column(String(1000), default="")  # comma-separated
    user_id: Mapped[int] = mapped_column(ForeignKey("user.user_id"), nullable=False)


class UserTagAssignment(Base):
    __tablename__ = "user_tag_assignment"

    assignment_id: Mapped[int] = mapped_column(primary_key=True)
    tag_id: Mapped[int] = mapped_column(ForeignKey("tag.tag_id", ondelete="CASCADE"), nullable=False)
    conversation_hash: Mapped[str] = mapped_column(String(100), nullable=False)

    __table_args__ = (UniqueConstraint("tag_id", "conversation_hash"),)
