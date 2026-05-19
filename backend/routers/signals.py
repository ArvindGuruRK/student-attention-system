import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.session import ClassSession
from backend.models.signal import AttentionSignal
from backend.models.student import Student
from backend.models.teacher import Teacher
from backend.schemas.signal import SignalIn, SignalOut
from backend.services.auth_service import get_current_teacher, oauth2_scheme

router = APIRouter(prefix="/api/signals", tags=["signals"])


async def _teacher(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> Teacher:
    """Dependency: resolve and return the authenticated teacher."""
    return await get_current_teacher(token, db)


@router.post("", status_code=202)
async def ingest_signal(body: SignalIn, db: AsyncSession = Depends(get_db)) -> dict:
    """REST fallback: persist a single attention signal authenticated by session_token."""
    student_result = await db.execute(select(Student).where(Student.session_token == body.token))
    student = student_result.scalar_one_or_none()
    if not student or student.id != body.student_id:
        raise HTTPException(status_code=401, detail="Invalid token or student ID")

    session_result = await db.execute(
        select(ClassSession).where(ClassSession.id == body.session_id, ClassSession.ended_at.is_(None))
    )
    if not session_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Active session not found")

    signal = AttentionSignal(
        session_id=body.session_id,
        student_id=body.student_id,
        attention_score=body.attention_score,
        flags=body.flags,
        yaw=body.yaw,
        pitch=body.pitch,
        timestamp=body.timestamp or datetime.now(timezone.utc),
    )
    db.add(signal)
    await db.commit()
    return {"accepted": True}


@router.get("/sessions/{session_id}", response_model=list[SignalOut])
async def get_session_signals(
    session_id: uuid.UUID,
    limit: int = Query(100, le=1000),
    offset: int = Query(0, ge=0),
    teacher: Teacher = Depends(_teacher),
    db: AsyncSession = Depends(get_db),
) -> list[AttentionSignal]:
    """Return paginated signals for a session (teacher auth required)."""
    result = await db.execute(
        select(AttentionSignal)
        .where(AttentionSignal.session_id == session_id)
        .order_by(AttentionSignal.timestamp.desc())
        .offset(offset)
        .limit(limit)
    )
    return list(result.scalars().all())


@router.get("/students/{student_id}", response_model=list[SignalOut])
async def get_student_signals(
    student_id: uuid.UUID,
    session_id: uuid.UUID,
    limit: int = Query(100, le=1000),
    teacher: Teacher = Depends(_teacher),
    db: AsyncSession = Depends(get_db),
) -> list[AttentionSignal]:
    """Return signals for a specific student in a session (teacher auth required)."""
    result = await db.execute(
        select(AttentionSignal)
        .where(AttentionSignal.student_id == student_id, AttentionSignal.session_id == session_id)
        .order_by(AttentionSignal.timestamp.desc())
        .limit(limit)
    )
    return list(result.scalars().all())
