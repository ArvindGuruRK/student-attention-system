import json
from typing import Optional

import redis.asyncio as aioredis

BUFFER_MAX = 20  # last 20 signals ≈ 60 seconds at 3-second intervals
_SIGNAL_KEY = "signals:{session_id}:{student_id}"
_STATE_KEY = "student_state:{session_id}:{student_id}"
_PAUSE_KEY = "session_pause:{session_id}"
_ACTIVE_SESSIONS_KEY = "active_sessions"


async def push_signal_to_buffer(
    redis: aioredis.Redis,
    session_id: str,
    student_id: str,
    score: int,
) -> list[int]:
    """Push a score onto the rolling window and return the current window contents."""
    key = _SIGNAL_KEY.format(session_id=session_id, student_id=student_id)
    pipe = redis.pipeline()
    pipe.rpush(key, score)
    pipe.ltrim(key, -BUFFER_MAX, -1)
    pipe.lrange(key, 0, -1)
    pipe.expire(key, 7200)  # 2-hour TTL prevents memory leak after session ends
    results = await pipe.execute()
    return [int(v) for v in results[2]]


async def get_student_state(
    redis: aioredis.Redis,
    session_id: str,
    student_id: str,
) -> Optional[dict]:
    """Read the persisted alert state for a student; returns None if not set."""
    raw = await redis.get(_STATE_KEY.format(session_id=session_id, student_id=student_id))
    return json.loads(raw) if raw else None


async def set_student_state(
    redis: aioredis.Redis,
    session_id: str,
    student_id: str,
    state: dict,
) -> None:
    """Persist student alert state with a 2-hour TTL."""
    key = _STATE_KEY.format(session_id=session_id, student_id=student_id)
    await redis.set(key, json.dumps(state), ex=7200)


async def is_session_paused(redis: aioredis.Redis, session_id: str) -> bool:
    """Return True if the teacher has paused alert monitoring for this session."""
    return bool(await redis.exists(_PAUSE_KEY.format(session_id=session_id)))


async def pause_session(redis: aioredis.Redis, session_id: str, duration_seconds: int) -> None:
    """Mark a session as paused; key auto-expires after duration_seconds."""
    await redis.set(_PAUSE_KEY.format(session_id=session_id), "1", ex=duration_seconds)


async def register_active_session(redis: aioredis.Redis, session_id: str) -> None:
    """Track a session ID in the active-sessions set."""
    await redis.sadd(_ACTIVE_SESSIONS_KEY, session_id)


async def unregister_active_session(redis: aioredis.Redis, session_id: str) -> None:
    """Remove a session from the active-sessions set when it ends."""
    await redis.srem(_ACTIVE_SESSIONS_KEY, session_id)


async def get_active_session_ids(redis: aioredis.Redis) -> list[str]:
    """Return all currently active session IDs."""
    return list(await redis.smembers(_ACTIVE_SESSIONS_KEY))


async def get_all_student_buffers(
    redis: aioredis.Redis,
    session_id: str,
    student_ids: list[str],
) -> dict[str, list[int]]:
    """Batch-read rolling score buffers for all students in a session."""
    if not student_ids:
        return {}
    pipe = redis.pipeline()
    for sid in student_ids:
        pipe.lrange(_SIGNAL_KEY.format(session_id=session_id, student_id=sid), 0, -1)
    results = await pipe.execute()
    return {student_ids[i]: [int(v) for v in results[i]] for i in range(len(student_ids))}
