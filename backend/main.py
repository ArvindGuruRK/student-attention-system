import asyncio
from contextlib import asynccontextmanager

import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import settings
from backend.database import AsyncSessionLocal, engine, Base
from backend.redis_client import close_redis, get_redis
from backend.routers import auth, classrooms, students, sessions, signals
from backend.socket_server import sio

# Side-effect imports: registering Socket.io event handlers via @sio.event decorators
import backend.socketio_handlers.student_events  # noqa: F401  # pyright: ignore[reportUnusedImport]
import backend.socketio_handlers.teacher_events  # noqa: F401  # pyright: ignore[reportUnusedImport]


async def _snapshot_broadcaster() -> None:
    """
    Background task: every 5 seconds emit SESSION_SNAPSHOT to all active session rooms.
    Reads student buffers from Redis and broadcasts aggregated state to the teacher dashboard.
    """
    from sqlalchemy import select
    from backend.models.session import ClassSession
    from backend.models.student import Student
    from backend.services.redis_service import get_active_session_ids, get_all_student_buffers, get_all_student_states, unregister_active_session
    from backend.services.attention_service import compute_ema, score_to_status, build_session_snapshot

    while True:
        await asyncio.sleep(5)
        try:
            redis = await get_redis()
            active_ids = await get_active_session_ids(redis)
            if not active_ids:
                continue

            async with AsyncSessionLocal() as db:
                for session_id_str in active_ids:
                    # Load students for this session's classroom
                    import uuid
                    session_result = await db.execute(
                        select(ClassSession).where(ClassSession.id == uuid.UUID(session_id_str))
                    )
                    session = session_result.scalar_one_or_none()
                    if not session or session.ended_at is not None:
                        # Session ended or deleted — evict from active set so we stop broadcasting
                        await unregister_active_session(redis, session_id_str)
                        continue

                    students_result = await db.execute(
                        select(Student).where(Student.classroom_id == session.classroom_id)
                    )
                    all_students = students_result.scalars().all()
                    if not all_students:
                        continue

                    student_ids = [str(s.id) for s in all_students]
                    name_map = {str(s.id): s.name for s in all_students}

                    buffers = await get_all_student_buffers(redis, session_id_str, student_ids)
                    states = await get_all_student_states(redis, session_id_str, student_ids)
                    scores: dict[str, float] = {}
                    statuses: dict[str, str] = {}
                    flags_map: dict[str, list[str]] = {}

                    for sid in student_ids:
                        buf = buffers.get(sid, [])
                        state = states.get(sid)
                        if buf:
                            ema = compute_ema(buf)
                        elif state:
                            # Buffer expired but state is still warm — use cached EMA
                            ema = state.get("ema_score", 100.0)
                        else:
                            continue  # Skip: student hasn't joined yet
                        scores[sid] = ema
                        statuses[sid] = score_to_status(ema, 40, 60)
                        flags_map[sid] = state.get("flags", []) if state else []

                    snapshot = build_session_snapshot(session_id_str, scores, name_map, statuses, flags_map)
                    await sio.emit("SESSION_SNAPSHOT", snapshot, room=f"session:{session_id_str}")
        except Exception:
            pass  # Never crash the broadcaster loop


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Create DB tables on startup, start background broadcaster, close Redis on shutdown."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await get_redis()
    task = asyncio.create_task(_snapshot_broadcaster())
    yield
    task.cancel()
    await close_redis()


_fastapi_app = FastAPI(title="Student Attention Monitor API", version="1.0.0", lifespan=lifespan)

_fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.socketio_cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_fastapi_app.include_router(auth.router)
_fastapi_app.include_router(classrooms.router)
_fastapi_app.include_router(students.router)
_fastapi_app.include_router(sessions.router)
_fastapi_app.include_router(signals.router)

# `app` IS the uvicorn entry point — Socket.io ASGI wraps FastAPI so both share one port
app = socketio.ASGIApp(sio, _fastapi_app)
