import uuid
from datetime import datetime

from pydantic import BaseModel, field_validator


class StudentCreate(BaseModel):
    """Payload for adding a new student to a classroom."""
    name: str


class StudentJoinRequest(BaseModel):
    """Payload for a student self-registering into an active session."""
    name: str
    roll_number: str

    @field_validator("name", "roll_number")
    @classmethod
    def not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Field cannot be blank")
        return v.strip()


class StudentJoinResponse(BaseModel):
    """Returned to a self-registering student so they can connect via Socket.io."""
    session_token: str
    student_id: uuid.UUID
    session_id: uuid.UUID


class StudentOut(BaseModel):
    """Student data returned from the API (includes session_token for sharing)."""
    id: uuid.UUID
    classroom_id: uuid.UUID
    name: str
    session_token: str
    created_at: datetime

    model_config = {"from_attributes": True}
