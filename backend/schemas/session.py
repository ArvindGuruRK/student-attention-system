import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class SessionOut(BaseModel):
    """Class session data returned from the API."""
    id: uuid.UUID
    classroom_id: uuid.UUID
    classroom_name: Optional[str] = None
    started_at: datetime
    ended_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class StudentSessionStats(BaseModel):
    """Per-student analytics for a completed session."""
    student_id: uuid.UUID
    student_name: str
    avg_score: float
    min_score: int
    max_score: int
    alert_count: int
    top_flags: list[str]


class SessionReport(BaseModel):
    """Full analytics report for a completed session."""
    session_id: uuid.UUID
    classroom_id: uuid.UUID
    started_at: datetime
    ended_at: Optional[datetime]
    duration_minutes: float
    class_avg: float
    at_risk_count: int
    student_stats: list[StudentSessionStats]
    timeline: list[dict]  # [{minute: int, avg_score: float}]
