import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import BigInteger, SmallInteger, ARRAY, String, Float, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database import Base


class AttentionSignal(Base):
    __tablename__ = "attention_signals"
    __table_args__ = (
        Index("ix_signals_session_student_ts", "session_id", "student_id", "timestamp"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("class_sessions.id"), nullable=False)
    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False)
    attention_score: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    flags: Mapped[Optional[list[str]]] = mapped_column(ARRAY(String), nullable=True)
    yaw: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    pitch: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )

    session: Mapped["ClassSession"] = relationship("ClassSession", back_populates="signals")
    student: Mapped["Student"] = relationship("Student", back_populates="signals")
