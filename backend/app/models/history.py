from datetime import datetime
from .base import Base
from .user import User

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

class History(Base):
    __tablename__ = "history"
    history_id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.user_id"), index=True)
    search_query: Mapped[str] = mapped_column(String(500))
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    user: Mapped[User] = relationship("User", back_populates="histories")