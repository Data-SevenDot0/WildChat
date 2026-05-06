from datetime import datetime
from typing import TYPE_CHECKING
from .base import Base

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from .history import History

class User(Base):
	__tablename__ = "user"

	user_id: Mapped[int] = mapped_column(primary_key=True)
	username: Mapped[str] = mapped_column(String(80), unique=True, index=True)
	email: Mapped[str] = mapped_column(String(200), unique=True, index=True)
	hashed_password: Mapped[str] = mapped_column(String(200))
	histories: Mapped[list["History"]] = relationship("History", back_populates="user")
	hashed_ip: Mapped[str] = mapped_column(String(200))
	