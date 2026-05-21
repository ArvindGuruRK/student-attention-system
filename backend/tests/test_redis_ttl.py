"""Tests for Redis buffer TTL fix in redis_service.push_signal_to_buffer."""

import pytest
from unittest.mock import AsyncMock, MagicMock, call


def _make_pipeline_mock(results):
    """Return a mock pipeline whose execute() returns the given results list."""
    pipe = MagicMock()
    pipe.rpush = MagicMock()
    pipe.ltrim = MagicMock()
    pipe.lrange = MagicMock()
    pipe.expire = MagicMock()
    pipe.execute = AsyncMock(return_value=results)
    return pipe


def _make_redis_mock(pipe):
    redis = MagicMock()
    redis.pipeline = MagicMock(return_value=pipe)
    return redis


@pytest.mark.asyncio
async def test_push_signal_sets_expire_on_buffer_key():
    """expire() must be called on the signal buffer key with a 2-hour TTL."""
    # Pipeline returns: rpush count, ltrim status, lrange list, expire result
    pipe = _make_pipeline_mock([1, b"OK", [b"75"], 1])
    redis = _make_redis_mock(pipe)

    from backend.services.redis_service import push_signal_to_buffer
    await push_signal_to_buffer(redis, "sess-1", "stu-1", 75)

    pipe.expire.assert_called_once()
    args = pipe.expire.call_args.args
    key = args[0]
    ttl = args[1]
    assert "sess-1" in key
    assert "stu-1" in key
    assert ttl == 7200, f"Expected 7200s TTL, got {ttl}"


@pytest.mark.asyncio
async def test_push_signal_returns_window_scores():
    """Return value must be the decoded integer list from lrange (index 2)."""
    pipe = _make_pipeline_mock([1, b"OK", [b"50", b"60", b"75"], 1])
    redis = _make_redis_mock(pipe)

    from backend.services.redis_service import push_signal_to_buffer
    result = await push_signal_to_buffer(redis, "sess-1", "stu-1", 75)

    assert result == [50, 60, 75]


@pytest.mark.asyncio
async def test_push_signal_pipeline_order():
    """rpush → ltrim → lrange → expire must all be queued before execute."""
    call_order: list[str] = []

    pipe = MagicMock()
    pipe.rpush = MagicMock(side_effect=lambda *a: call_order.append("rpush"))
    pipe.ltrim = MagicMock(side_effect=lambda *a: call_order.append("ltrim"))
    pipe.lrange = MagicMock(side_effect=lambda *a: call_order.append("lrange"))
    pipe.expire = MagicMock(side_effect=lambda *a: call_order.append("expire"))
    pipe.execute = AsyncMock(return_value=[1, b"OK", [b"80"], 1])

    redis = _make_redis_mock(pipe)

    from backend.services.redis_service import push_signal_to_buffer
    await push_signal_to_buffer(redis, "sess-x", "stu-x", 80)

    assert call_order == ["rpush", "ltrim", "lrange", "expire"], (
        f"Unexpected pipeline call order: {call_order}"
    )


@pytest.mark.asyncio
async def test_push_signal_key_uses_correct_ids():
    """The pipeline key must embed both session_id and student_id."""
    captured_keys: list[str] = []

    pipe = MagicMock()
    pipe.rpush = MagicMock(side_effect=lambda key, *a: captured_keys.append(("rpush", key)))
    pipe.ltrim = MagicMock()
    pipe.lrange = MagicMock()
    pipe.expire = MagicMock(side_effect=lambda key, *a: captured_keys.append(("expire", key)))
    pipe.execute = AsyncMock(return_value=[1, b"OK", [b"90"], 1])

    redis = _make_redis_mock(pipe)

    from backend.services.redis_service import push_signal_to_buffer
    await push_signal_to_buffer(redis, "my-session", "my-student", 90)

    rpush_key = next(v for op, v in captured_keys if op == "rpush")
    expire_key = next(v for op, v in captured_keys if op == "expire")

    assert "my-session" in rpush_key
    assert "my-student" in rpush_key
    assert rpush_key == expire_key, "expire must use the same key as rpush"
