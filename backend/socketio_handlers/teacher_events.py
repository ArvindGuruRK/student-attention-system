import uuid

from sqlalchemy import select

from backend.database import AsyncSessionLocal
from backend.models.classroom import Classroom
from backend.models.session import ClassSession
from backend.redis_client import get_redis
from backend.services.auth_service import get_current_teacher
from backend.services.redis_service import pause_session
from backend.socket_server import sio


@sio.event
async def join_classroom(sid: str, data: dict) -> None:
    """Teacher joins a session room to receive live student updates."""
    raw_jwt: str = data.get("teacher_jwt", "")
    jwt_token = raw_jwt.replace("Bearer ", "").strip()
    session_id_str: str | None = data.get("session_id")

    if not jwt_token or not session_id_str:
        await sio.emit("error", {"message": "teacher_jwt and session_id required"}, to=sid)
        return

    async with AsyncSessionLocal() as db:
        try:
            teacher = await get_current_teacher(jwt_token, db)
        except Exception:
            await sio.emit("error", {"message": "Invalid JWT"}, to=sid)
            return

        session_result = await db.execute(
            select(ClassSession).where(ClassSession.id == uuid.UUID(session_id_str))
        )
        session = session_result.scalar_one_or_none()
        if not session:
            await sio.emit("error", {"message": "Session not found"}, to=sid)
            return

        classroom_result = await db.execute(
            select(Classroom).where(
                Classroom.id == session.classroom_id,
                Classroom.teacher_id == teacher.id,
            )
        )
        if not classroom_result.scalar_one_or_none():
            await sio.emit("error", {"message": "Not authorized for this session"}, to=sid)
            return

    await sio.enter_room(sid, f"session:{session_id_str}")
    await sio.emit("joined_classroom", {"session_id": session_id_str}, to=sid)


@sio.event
async def pause_monitoring(sid: str, data: dict) -> None:
    """Teacher temporarily pauses alert monitoring for a session."""
    session_id_str: str | None = data.get("session_id")
    duration: int = int(data.get("duration_seconds", 120))
    if not session_id_str:
        return

    redis = await get_redis()
    await pause_session(redis, session_id_str, duration)
    await sio.emit(
        "monitoring_paused",
        {"session_id": session_id_str, "duration": duration},
        room=f"session:{session_id_str}",
    )
