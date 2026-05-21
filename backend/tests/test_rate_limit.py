"""Tests for the rate-limit guard on POST /api/sessions/{session_id}/join."""

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

# Force module import so patch() can resolve backend.routers.sessions.* names
import backend.routers.sessions


def _make_session(session_id, classroom_id, ended=False):
    s = MagicMock()
    s.id = session_id
    s.classroom_id = classroom_id
    s.ended_at = MagicMock() if ended else None
    return s


def _make_db(session_obj):
    result = MagicMock()
    result.scalar_one_or_none.return_value = session_obj
    db = AsyncMock()
    db.execute.return_value = result

    # Simulate DB assigning a UUID to the new Student row on refresh
    async def _refresh(obj):
        if not getattr(obj, "id", None):
            obj.id = uuid.uuid4()

    db.refresh = AsyncMock(side_effect=_refresh)
    return db


def _make_request(ip: str = "1.2.3.4"):
    req = MagicMock()
    req.client.host = ip
    return req


def _make_body(name="Alice", roll="CS101"):
    body = MagicMock()
    body.name = name
    body.roll_number = roll
    return body


@pytest.mark.asyncio
async def test_first_join_succeeds():
    """First attempt from an IP must go through (counter = 1)."""
    session_id = uuid.uuid4()
    mock_session = _make_session(session_id, uuid.uuid4())
    db = _make_db(mock_session)
    redis = AsyncMock()
    redis.incr = AsyncMock(return_value=1)
    redis.expire = AsyncMock()

    with patch("backend.routers.sessions.get_redis", new=AsyncMock(return_value=redis)):
        from backend.routers.sessions import student_join_session
        result = await student_join_session(
            session_id=session_id,
            body=_make_body(),
            request=_make_request(),
            db=db,
        )

    assert result.session_token is not None


@pytest.mark.asyncio
async def test_third_join_succeeds():
    """Third attempt from the same IP must still succeed (counter = 3, limit = 3)."""
    session_id = uuid.uuid4()
    mock_session = _make_session(session_id, uuid.uuid4())
    db = _make_db(mock_session)
    redis = AsyncMock()
    redis.incr = AsyncMock(return_value=3)
    redis.expire = AsyncMock()

    with patch("backend.routers.sessions.get_redis", new=AsyncMock(return_value=redis)):
        from backend.routers.sessions import student_join_session
        result = await student_join_session(
            session_id=session_id,
            body=_make_body(),
            request=_make_request(),
            db=db,
        )

    assert result.session_token is not None


@pytest.mark.asyncio
async def test_fourth_join_raises_429():
    """Fourth attempt from the same IP must raise HTTP 429."""
    session_id = uuid.uuid4()
    mock_session = _make_session(session_id, uuid.uuid4())
    db = _make_db(mock_session)
    redis = AsyncMock()
    redis.incr = AsyncMock(return_value=4)
    redis.expire = AsyncMock()

    with patch("backend.routers.sessions.get_redis", new=AsyncMock(return_value=redis)):
        from backend.routers.sessions import student_join_session
        with pytest.raises(HTTPException) as exc_info:
            await student_join_session(
                session_id=session_id,
                body=_make_body(),
                request=_make_request("5.6.7.8"),
                db=db,
            )

    assert exc_info.value.status_code == 429


@pytest.mark.asyncio
async def test_ttl_set_on_first_hit():
    """expire() must be called on the rate-limit key only on the first hit (count == 1)."""
    session_id = uuid.uuid4()
    mock_session = _make_session(session_id, uuid.uuid4())
    db = _make_db(mock_session)
    redis = AsyncMock()
    redis.incr = AsyncMock(return_value=1)
    redis.expire = AsyncMock()

    with patch("backend.routers.sessions.get_redis", new=AsyncMock(return_value=redis)):
        from backend.routers.sessions import student_join_session
        await student_join_session(
            session_id=session_id,
            body=_make_body(),
            request=_make_request(),
            db=db,
        )

    redis.expire.assert_awaited_once()
    ttl_arg = redis.expire.call_args.args[1]
    assert ttl_arg == 3600, f"Expected 1-hour TTL (3600s), got {ttl_arg}"


@pytest.mark.asyncio
async def test_ttl_not_set_on_subsequent_hits():
    """expire() must NOT be called when counter > 1 (TTL already set on first hit)."""
    session_id = uuid.uuid4()
    mock_session = _make_session(session_id, uuid.uuid4())
    db = _make_db(mock_session)
    redis = AsyncMock()
    redis.incr = AsyncMock(return_value=2)
    redis.expire = AsyncMock()

    with patch("backend.routers.sessions.get_redis", new=AsyncMock(return_value=redis)):
        from backend.routers.sessions import student_join_session
        await student_join_session(
            session_id=session_id,
            body=_make_body(),
            request=_make_request(),
            db=db,
        )

    redis.expire.assert_not_awaited()


@pytest.mark.asyncio
async def test_different_ips_tracked_separately():
    """Rate limit is per-IP — two different IPs each get their own counter."""
    session_id = uuid.uuid4()

    call_count = 0
    async def incr_side_effect(key):
        nonlocal call_count
        call_count += 1
        return 1  # each IP starts fresh

    redis = AsyncMock()
    redis.incr = AsyncMock(side_effect=incr_side_effect)
    redis.expire = AsyncMock()

    captured_keys: list[str] = []

    async def expire_side_effect(key, ttl):
        captured_keys.append(key)

    redis.expire = AsyncMock(side_effect=expire_side_effect)

    for ip in ["10.0.0.1", "10.0.0.2"]:
        mock_session = _make_session(session_id, uuid.uuid4())
        db = _make_db(mock_session)
        with patch("backend.routers.sessions.get_redis", new=AsyncMock(return_value=redis)):
            from backend.routers.sessions import student_join_session
            await student_join_session(
                session_id=session_id,
                body=_make_body(),
                request=_make_request(ip),
                db=db,
            )

    assert len(captured_keys) == 2
    assert captured_keys[0] != captured_keys[1], "Each IP must get its own rate-limit key"
