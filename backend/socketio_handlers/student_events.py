import uuid
from datetime import datetime, timezone

from sqlalchemy import select

from backend.database import AsyncSessionLocal
from backend.models.classroom import Classroom
from backend.models.session import ClassSession
from backend.models.signal import AttentionSignal
from backend.models.student import Student
from backend.redis_client import get_redis
from backend.services.attention_service import (
    apply_phone_penalty,
    build_alert_payload,
    build_status_update_payload,
    compute_ema,
    score_to_status,
    should_fire_alert,
    should_fire_phone_alert,
)
from backend.services.redis_service import (
    get_student_state,
    is_session_paused,
    push_signal_to_buffer,
    set_student_state,
)
from backend.socket_server import sio


@sio.event
async def join_session(sid: str, data: dict) -> None:
    """Student joins their monitoring session room using their session_token."""
    token = data.get("token")
    if not token:
        await sio.emit("error", {"message": "Token required"}, to=sid)
        return

    async with AsyncSessionLocal() as db:
        student_result = await db.execute(select(Student).where(Student.session_token == token))
        student = student_result.scalar_one_or_none()
        if not student:
            await sio.emit("error", {"message": "Invalid token"}, to=sid)
            return

        session_result = await db.execute(
            select(ClassSession).where(
                ClassSession.classroom_id == student.classroom_id,
                ClassSession.ended_at.is_(None),
            )
        )
        session = session_result.scalar_one_or_none()
        if not session:
            await sio.emit("error", {"message": "No active session for your classroom"}, to=sid)
            return

        await sio.enter_room(sid, f"session:{session.id}")
        await sio.save_session(sid, {
            "student_id": str(student.id),
            "student_name": student.name,
            "session_id": str(session.id),
            "classroom_id": str(student.classroom_id),
        })
        await sio.emit("joined", {"session_id": str(session.id), "student_id": str(student.id)}, to=sid)


@sio.event
async def signal(sid: str, data: dict) -> None:
    """Process an attention signal: apply phone penalty, update Redis buffer, recompute EMA, broadcast updates."""
    session_data = await sio.get_session(sid)
    if not session_data:
        return

    student_id_str: str = session_data["student_id"]
    student_name: str = session_data["student_name"]
    session_id_str: str = session_data["session_id"]
    room = f"session:{session_id_str}"

    redis = await get_redis()
    if await is_session_paused(redis, session_id_str):
        return

    raw_score = int(data.get("attention_score", 100))
    flags: list[str] = data.get("flags", [])
    yaw: float | None = data.get("yaw")
    pitch: float | None = data.get("pitch")

    # Deduct 30 points for phone usage before it enters the EMA window
    effective_score = apply_phone_penalty(raw_score, flags)

    # Update rolling buffer and compute EMA on the effective (penalized) score
    scores = await push_signal_to_buffer(redis, session_id_str, student_id_str, effective_score)
    ema_score = compute_ema(scores)

    # Load per-classroom thresholds and persist signal to DB
    async with AsyncSessionLocal() as db:
        session_result = await db.execute(select(ClassSession).where(ClassSession.id == uuid.UUID(session_id_str)))
        session = session_result.scalar_one_or_none()
        alert_threshold = 40
        warn_threshold = 60
        if session:
            classroom_result = await db.execute(select(Classroom).where(Classroom.id == session.classroom_id))
            classroom = classroom_result.scalar_one_or_none()
            if classroom:
                alert_threshold = classroom.alert_threshold
                warn_threshold = classroom.warn_threshold

        db.add(AttentionSignal(
            session_id=uuid.UUID(session_id_str),
            student_id=uuid.UUID(student_id_str),
            attention_score=effective_score,  # store penalized score — consistent with what the EMA sees
            flags=flags,
            yaw=yaw,
            pitch=pitch,
            timestamp=datetime.now(timezone.utc),
        ))
        await db.commit()

    current_status = score_to_status(ema_score, alert_threshold, warn_threshold)
    prev_state = await get_student_state(redis, session_id_str, student_id_str)
    previous_status = prev_state.get("status") if prev_state else None
    previous_flags: list[str] = prev_state.get("flags", []) if prev_state else []

    await set_student_state(redis, session_id_str, student_id_str, {
        "status": current_status,
        "ema_score": ema_score,
        "flags": flags,  # persisted so next signal can detect phone flag transitions
    })

    # Always broadcast STATUS_UPDATE so the teacher tile reflects new score and flags
    await sio.emit(
        "STATUS_UPDATE",
        build_status_update_payload(
            uuid.UUID(student_id_str), student_name, current_status, ema_score, flags, yaw, pitch
        ),
        room=room,
    )

    # Fire score-based alert only on state transitions (not every signal)
    alert_type = should_fire_alert(current_status, previous_status)
    if alert_type:
        await sio.emit(
            "ALERT",
            build_alert_payload(uuid.UUID(student_id_str), student_name, alert_type, ema_score, flags),
            room=room,
        )

    # Fire PHONE_DETECTED on the first signal where the flag appears — independent of score threshold
    if should_fire_phone_alert(flags, previous_flags):
        await sio.emit(
            "ALERT",
            build_alert_payload(uuid.UUID(student_id_str), student_name, "PHONE_DETECTED", ema_score, flags),
            room=room,
        )
