import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class SignalIn(BaseModel):
    """Attention signal payload from a student (REST fallback or Socket.io)."""
    session_id: uuid.UUID
    student_id: uuid.UUID
    token: str
    attention_score: int
    flags: list[str] = []
    yaw: Optional[float] = None
    pitch: Optional[float] = None
    timestamp: Optional[datetime] = None


class SignalOut(BaseModel):
    """Attention signal row returned from the API."""
    id: int
    session_id: uuid.UUID
    student_id: uuid.UUID
    attention_score: int
    flags: Optional[list[str]]
    yaw: Optional[float]
    pitch: Optional[float]
    timestamp: datetime

    model_config = {"from_attributes": True}


class AlertPayload(BaseModel):
    """ALERT event payload broadcast to the teacher dashboard."""
    type: str = "ALERT"
    student_id: str
    student_name: str
    alert_type: str
    attention_score: int
    flags: list[str] = []
    timestamp: str
