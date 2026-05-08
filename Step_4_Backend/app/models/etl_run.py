from datetime import datetime
from .base import Base

from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column


class EtlRun(Base):
    __tablename__ = "etl_run"

    id: Mapped[int] = mapped_column(primary_key=True)
    ran_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    rows_processed: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(16))   # "success" | "error"
    errors: Mapped[int] = mapped_column(Integer, default=0)
    duration_seconds: Mapped[float] = mapped_column(default=0.0)
    notes: Mapped[str] = mapped_column(String(500), default="")
