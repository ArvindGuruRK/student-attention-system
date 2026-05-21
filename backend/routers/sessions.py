import secrets
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.classroom import Classroom
from backend.models.session import ClassSession
from backend.models.signal import AttentionSignal
from backend.models.student import Student
from backend.models.teacher import Teacher
from backend.redis_client import get_redis
from backend.schemas.session import SessionOut, SessionReport
from backend.schemas.student import StudentJoinRequest, StudentJoinResponse
from backend.services.auth_service import get_current_teacher, oauth2_scheme
from backend.services.redis_service import unregister_active_session
from backend.services.pdf_service import generate_session_pdf
from backend.services.report_service import generate_session_report
from backend.socket_server import sio

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


async def _teacher(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> Teacher:
    """Dependency: resolve and return the authenticated teacher."""
    return await get_current_teacher(token, db)


@router.post("/{session_id}/join", response_model=StudentJoinResponse, status_code=status.HTTP_201_CREATED)
async def student_join_session(
    session_id: uuid.UUID,
    body: StudentJoinRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> StudentJoinResponse:
    """Public endpoint: student self-registers into an active session by providing name and roll number."""
    # Rate-limit: max 3 join attempts per IP per session to prevent dashboard flooding
    redis = await get_redis()
    rate_key = f"join_rate:{session_id}:{request.client.host}"
    count = await redis.incr(rate_key)
    if count == 1:
        await redis.expire(rate_key, 3600)  # 1-hour window
    if count > 3:
        raise HTTPException(status_code=429, detail="Too many registration attempts from this address")

    session_result = await db.execute(
        select(ClassSession).where(ClassSession.id == session_id, ClassSession.ended_at.is_(None))
    )
    session = session_result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or already ended")

    display_name = f"{body.name} ({body.roll_number})"
    token = secrets.token_urlsafe(48)
    student = Student(classroom_id=session.classroom_id, name=display_name, session_token=token)
    db.add(student)
    await db.commit()
    await db.refresh(student)
    return StudentJoinResponse(session_token=token, student_id=student.id, session_id=session_id)


@router.get("/{session_id}", response_model=SessionOut)
async def get_session(
    session_id: uuid.UUID,
    teacher: Teacher = Depends(_teacher),
    db: AsyncSession = Depends(get_db),
) -> SessionOut:
    """Get a single session by ID (used to check active/ended status)."""
    session = await _owned_session(session_id, teacher.id, db)
    return SessionOut(id=session.id, classroom_id=session.classroom_id, started_at=session.started_at, ended_at=session.ended_at)


@router.post("/start", response_model=SessionOut, status_code=status.HTTP_201_CREATED)
async def start_session(
    classroom_id: uuid.UUID,
    teacher: Teacher = Depends(_teacher),
    db: AsyncSession = Depends(get_db),
) -> SessionOut:
    """Start a new monitoring session for a classroom."""
    classroom = await _owned_classroom(classroom_id, teacher.id, db)
    session = ClassSession(classroom_id=classroom_id)
    db.add(session)
    await db.commit()
    await db.refresh(session)

    redis = await get_redis()
    from backend.services.redis_service import register_active_session
    await register_active_session(redis, str(session.id))
    return SessionOut(
        id=session.id,
        classroom_id=session.classroom_id,
        classroom_name=classroom.name,
        started_at=session.started_at,
        ended_at=session.ended_at,
    )


@router.post("/{session_id}/end", response_model=SessionOut)
async def end_session(
    session_id: uuid.UUID,
    teacher: Teacher = Depends(_teacher),
    db: AsyncSession = Depends(get_db),
) -> SessionOut:
    """End an active session and record its end time."""
    session = await _owned_session(session_id, teacher.id, db)
    if session.ended_at is not None:
        raise HTTPException(status_code=400, detail="Session already ended")
    session.ended_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(session)

    redis = await get_redis()
    await unregister_active_session(redis, str(session_id))
    await sio.emit(
        "SESSION_ENDED",
        {"session_id": str(session_id)},
        room=f"session:{session_id}",
    )
    return SessionOut(id=session.id, classroom_id=session.classroom_id, started_at=session.started_at, ended_at=session.ended_at)


@router.get("/{session_id}/report", response_model=SessionReport)
async def get_report(
    session_id: uuid.UUID,
    teacher: Teacher = Depends(_teacher),
    db: AsyncSession = Depends(get_db),
) -> SessionReport:
    """Generate and return analytics for a completed session."""
    await _owned_session(session_id, teacher.id, db)
    return await generate_session_report(session_id, db)


@router.get("/{session_id}/export/pdf")
async def export_pdf(
    session_id: uuid.UUID,
    teacher: Teacher = Depends(_teacher),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    """Stream a PDF report for the session."""
    await _owned_session(session_id, teacher.id, db)
    buffer = await generate_session_pdf(session_id, db)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=session_{session_id}.pdf"},
    )


@router.get("/{session_id}/export/csv")
async def export_csv(
    session_id: uuid.UUID,
    teacher: Teacher = Depends(_teacher),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    """Stream a CSV of all attention signals for the session in batches to avoid blocking the event loop."""
    await _owned_session(session_id, teacher.id, db)
    return StreamingResponse(
        _csv_generator(session_id, db),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=session_{session_id}.csv"},
    )


@router.get("/classrooms/{classroom_id}/sessions", response_model=list[SessionOut])
async def list_sessions(
    classroom_id: uuid.UUID,
    teacher: Teacher = Depends(_teacher),
    db: AsyncSession = Depends(get_db),
) -> list[SessionOut]:
    """Return all sessions for a classroom, newest first, with classroom name embedded."""
    classroom = await _owned_classroom(classroom_id, teacher.id, db)
    result = await db.execute(
        select(ClassSession)
        .where(ClassSession.classroom_id == classroom_id)
        .order_by(ClassSession.started_at.desc())
    )
    sessions = result.scalars().all()
    return [
        SessionOut(
            id=s.id,
            classroom_id=s.classroom_id,
            classroom_name=classroom.name,
            started_at=s.started_at,
            ended_at=s.ended_at,
        )
        for s in sessions
    ]


async def _owned_classroom(classroom_id: uuid.UUID, teacher_id: uuid.UUID, db: AsyncSession) -> Classroom:
    """Verify teacher owns this classroom or raise 404."""
    result = await db.execute(
        select(Classroom).where(Classroom.id == classroom_id, Classroom.teacher_id == teacher_id)
    )
    classroom = result.scalar_one_or_none()
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found")
    return classroom


async def _owned_session(session_id: uuid.UUID, teacher_id: uuid.UUID, db: AsyncSession) -> ClassSession:
    """Load a session and verify the teacher owns its classroom, or raise 404/403."""
    result = await db.execute(select(ClassSession).where(ClassSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    await _owned_classroom(session.classroom_id, teacher_id, db)
    return session


async def _csv_generator(session_id: uuid.UUID, db: AsyncSession):
    """Async generator: yields one summary row per student (avg, best, lowest, status breakdown, alert count)."""
    yield "Student Name,Avg Attention (%),Best Score,Lowest Score,% Time Attentive,% Time Distracted,% Time At-Risk,Alerts\n"

    # Aggregate all signals per student in a single pass
    result = await db.execute(
        select(AttentionSignal.attention_score, Student.name)
        .join(Student, AttentionSignal.student_id == Student.id)
        .where(AttentionSignal.session_id == session_id)
        .order_by(Student.name)
    )
    rows = result.all()

    # Group by student name
    buckets: dict[str, list[int]] = {}
    for score, name in rows:
        buckets.setdefault(name, []).append(score)

    for name, scores in buckets.items():
        total = len(scores)
        avg = round(sum(scores) / total)
        best = max(scores)
        lowest = min(scores)
        attentive = round(sum(1 for s in scores if s >= 80) / total * 100)
        distracted = round(sum(1 for s in scores if 60 <= s < 80) / total * 100)
        at_risk = round(sum(1 for s in scores if s < 60) / total * 100)
        alerts = sum(1 for s in scores if s < 40)
        yield f"{name},{avg},{best},{lowest},{attentive}%,{distracted}%,{at_risk}%,{alerts}\n"
