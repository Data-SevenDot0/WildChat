from datetime import datetime
from .base import Base

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column, relationship


class User(Base):
	__tablename__ = "user"

	user_id: Mapped[int] = mapped_column(primary_key=True)
	username: Mapped[str] = mapped_column(String(80), unique=True, index=True)
	email: Mapped[str] = mapped_column(String(200), unique=True, index=True)
	hashed_password: Mapped[str] = mapped_column(String(200))
	history: Mapped[object] = mapped_column()
	settings: Mapped[object] = mapped_column()
	hashed_ip: Mapped[str] = mapped_column(String(200))
	