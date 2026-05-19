"""Tests for end_session route — verifies SESSION_ENDED is emitted via Socket.io."""

import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch, call

import pytest


def _make_db_mock(session_obj, classroom_obj):
    """Return an AsyncMock DB session whose execute() yields session then classroom."""
    session_result = MagicMock()
    session_result.scalar_one_or_none.return_value = session_obj

    classroom_result = MagicMock()
    classroom_result.scalar_one_or_none.return_value = classroom_obj

    db = AsyncMock()
    db.execute.side_effect = [session_result, classroom_result]
    return db


def _make_active_session(session_id, classroom_id):
    """Return a mock ClassSession that has not ended yet."""
    s = MagicMock()
    s.id = session_id
    s.classroom_id = classroom_id
    s.ended_at = None
    s.started_at = datetime(2025, 1, 1, tzinfo=timezone.utc)
    return s


def _make_classroom(classroom_id, teacher_id):
    """Return a mock Classroom owned by teacher_id."""
    c = MagicMock()
    c.id = classroom_id
    c.teacher_id = teacher_id
    return c


def _make_teacher(teacher_id):
    t = MagicMock()
    t.id = teacher_id
    return t


# ---------------------------------------------------------------------------
# Test 1 — SESSION_ENDED emitted to correct room after DB commit
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_end_session_emits_session_ended_to_room():
    session_id = uuid.uuid4()
    teacher_id = uuid.uuid4()
    classroom_id = uuid.uuid4()

    mock_session = _make_active_session(session_id, classroom_id)
    mock_classroom = _make_classroom(classroom_id, teacher_id)
    mock_teacher = _make_teacher(teacher_id)
    mock_db = _make_db_mock(mock_session, mock_classroom)
    mock_redis = AsyncMock()

    with (
        patch("backend.routers.sessions.sio") as mock_sio,
        patch("backend.routers.sessions.unregister_active_session", new_callable=AsyncMock) as mock_unregister,
        patch("backend.routers.sessions.get_redis", return_value=mock_redis),
    ):
        mock_sio.emit = AsyncMock()

        from backend.routers.sessions import end_session

        result = await end_session(
            session_id=session_id,
            teacher=mock_teacher,
            db=mock_db,
        )

    mock_sio.emit.assert_awaited_once_with(
        "SESSION_ENDED",
        {"session_id": str(session_id)},
        room=f"session:{session_id}",
    )


# ---------------------------------------------------------------------------
# Test 2 — SESSION_ENDED is emitted AFTER unregister_active_session
#           (ordering: Redis cleared first, then students notified)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_end_session_emit_order_after_unregister():
    session_id = uuid.uuid4()
    teacher_id = uuid.uuid4()
    classroom_id = uuid.uuid4()

    mock_session = _make_active_session(session_id, classroom_id)
    mock_classroom = _make_classroom(classroom_id, teacher_id)
    mock_teacher = _make_teacher(teacher_id)
    mock_db = _make_db_mock(mock_session, mock_classroom)
    mock_redis = AsyncMock()

    call_order: list[str] = []

    async def fake_unregister(redis, sid):
        call_order.append("unregister")

    async def fake_emit(event, data, room=None):
        call_order.append("emit")

    with (
        patch("backend.routers.sessions.sio") as mock_sio,
        patch("backend.routers.sessions.unregister_active_session", side_effect=fake_unregister),
        patch("backend.routers.sessions.get_redis", return_value=mock_redis),
    ):
        mock_sio.emit = AsyncMock(side_effect=fake_emit)

        from backend.routers.sessions import end_session

        await end_session(session_id=session_id, teacher=mock_teacher, db=mock_db)

    assert call_order == ["unregister", "emit"], (
        f"Expected unregister before emit, got: {call_order}"
    )


# ---------------------------------------------------------------------------
# Test 3 — SESSION_ENDED payload contains the correct session_id string
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_end_session_emit_payload_contains_session_id():
    session_id = uuid.UUID("11111111-2222-3333-4444-555555555555")
    teacher_id = uuid.uuid4()
    classroom_id = uuid.uuid4()

    mock_session = _make_active_session(session_id, classroom_id)
    mock_classroom = _make_classroom(classroom_id, teacher_id)
    mock_teacher = _make_teacher(teacher_id)
    mock_db = _make_db_mock(mock_session, mock_classroom)
    mock_redis = AsyncMock()

    with (
        patch("backend.routers.sessions.sio") as mock_sio,
        patch("backend.routers.sessions.unregister_active_session", new_callable=AsyncMock),
        patch("backend.routers.sessions.get_redis", return_value=mock_redis),
    ):
        mock_sio.emit = AsyncMock()

        from backend.routers.sessions import end_session

        await end_session(session_id=session_id, teacher=mock_teacher, db=mock_db)

    _, kwargs = mock_sio.emit.call_args
    positional = mock_sio.emit.call_args.args

    assert positional[0] == "SESSION_ENDED"
    assert positional[1]["session_id"] == "11111111-2222-3333-4444-555555555555"
    assert kwargs.get("room") == "session:11111111-2222-3333-4444-555555555555"


# ---------------------------------------------------------------------------
# Test 4 — Already-ended session raises 400; no emit should happen
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_end_session_already_ended_raises_400_no_emit():
    from fastapi import HTTPException

    session_id = uuid.uuid4()
    teacher_id = uuid.uuid4()
    classroom_id = uuid.uuid4()

    mock_session = _make_active_session(session_id, classroom_id)
    mock_session.ended_at = datetime(2025, 1, 1, tzinfo=timezone.utc)  # already ended
    mock_classroom = _make_classroom(classroom_id, teacher_id)
    mock_teacher = _make_teacher(teacher_id)
    mock_db = _make_db_mock(mock_session, mock_classroom)
    mock_redis = AsyncMock()

    with (
        patch("backend.routers.sessions.sio") as mock_sio,
        patch("backend.routers.sessions.unregister_active_session", new_callable=AsyncMock),
        patch("backend.routers.sessions.get_redis", return_value=mock_redis),
    ):
        mock_sio.emit = AsyncMock()

        from backend.routers.sessions import end_session

        with pytest.raises(HTTPException) as exc_info:
            await end_session(session_id=session_id, teacher=mock_teacher, db=mock_db)

    assert exc_info.value.status_code == 400
    mock_sio.emit.assert_not_awaited()


# ---------------------------------------------------------------------------
# Test 5 — end_session returns SessionOut with ended_at populated
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_end_session_returns_session_out_with_ended_at():
    session_id = uuid.uuid4()
    teacher_id = uuid.uuid4()
    classroom_id = uuid.uuid4()

    mock_session = _make_active_session(session_id, classroom_id)
    mock_classroom = _make_classroom(classroom_id, teacher_id)
    mock_teacher = _make_teacher(teacher_id)
    mock_db = _make_db_mock(mock_session, mock_classroom)
    mock_redis = AsyncMock()

    with (
        patch("backend.routers.sessions.sio") as mock_sio,
        patch("backend.routers.sessions.unregister_active_session", new_callable=AsyncMock),
        patch("backend.routers.sessions.get_redis", return_value=mock_redis),
    ):
        mock_sio.emit = AsyncMock()

        from backend.routers.sessions import end_session

        result = await end_session(session_id=session_id, teacher=mock_teacher, db=mock_db)

    assert result.id == session_id
    assert result.classroom_id == classroom_id
    assert result.ended_at is not None
