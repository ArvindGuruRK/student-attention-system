import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database import Base


class Classroom(Base):
    __tablename__ = "classrooms"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    teacher_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("teachers.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    yaw_threshold: Mapped[int] = mapped_column(Integer, default=30)
    pitch_threshold: Mapped[int] = mapped_column(Integer, default=25)
    alert_threshold: Mapped[int] = mapped_column(Integer, default=40)
    warn_threshold: Mapped[int] = mapped_column(Integer, default=60)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    teacher: Mapped["Teacher"] = relationship("Teacher", back_populates="classrooms")
    students: Mapped[list["Student"]] = relationship(
        "Student", back_populates="classroom", cascade="all, delete-orphan"
    )
    sessions: Mapped[list["ClassSession"]] = relationship(
        "ClassSession", back_populates="classroom", cascade="all, delete-orphan"
    )
