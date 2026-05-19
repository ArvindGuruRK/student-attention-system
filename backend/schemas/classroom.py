import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ClassroomCreate(BaseModel):
    """Payload for creating a new classroom."""
    name: str
    yaw_threshold: int = 30
    pitch_threshold: int = 25
    alert_threshold: int = 40
    warn_threshold: int = 60


class ClassroomUpdate(BaseModel):
    """Payload for partial update of a classroom (PATCH)."""
    name: Optional[str] = None
    yaw_threshold: Optional[int] = None
    pitch_threshold: Optional[int] = None
    alert_threshold: Optional[int] = None
    warn_threshold: Optional[int] = None


class ClassroomOut(BaseModel):
    """Classroom data returned from the API."""
    id: uuid.UUID
    teacher_id: uuid.UUID
    name: str
    yaw_threshold: int
    pitch_threshold: int
    alert_threshold: int
    warn_threshold: int
    created_at: datetime

    model_config = {"from_attributes": True}
