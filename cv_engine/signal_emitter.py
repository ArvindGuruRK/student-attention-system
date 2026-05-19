import os
from datetime import datetime, timezone

import socketio

BACKEND_URL = os.getenv("BACKEND_URL", "http://127.0.0.1:8000")

# Persistent async Socket.io client — reuses a single connection across all emits
_client = socketio.SimpleClient()
_connected = False


def _ensure_connected() -> bool:
    """Connect to the backend Socket.io server if not already connected."""
    global _connected
    if not _connected:
        try:
            _client.connect(BACKEND_URL)
            _connected = True
        except Exception as e:
            print(f"[WARN] Socket.io connect failed: {e}")
            return False
    return True


def join_session(token: str) -> tuple[str, str] | None:
    """
    Send join_session event and return (session_id, student_id) from the backend
    'joined' response, or None if the join fails.
    """
    global _connected
    if not _ensure_connected():
        return None
    try:
        _client.emit("join_session", {"token": token})
        # Backend emits "joined" with session_id + student_id; wait up to 5 s
        event = _client.receive(timeout=5)
        if event and event[0] == "joined":
            return event[1]["session_id"], event[1]["student_id"]
        # Backend may have emitted an error event instead
        print(f"[WARN] Unexpected join response: {event}")
        return None
    except Exception as e:
        print(f"[WARN] join_session failed: {e}")
        _connected = False
        return None


def emit_signal(
    session_id: str,
    student_id: str,
    token: str,
    attention_score: int,
    flags: list[str],
    yaw: float | None,
    pitch: float | None,
) -> bool:
    """Emit a signal event to the backend; reconnects automatically on failure."""
    global _connected
    if not _ensure_connected():
        return False

    payload = {
        "session_id": session_id,
        "student_id": student_id,
        "token": token,
        "attention_score": attention_score,
        "flags": flags,
        "yaw": yaw,
        "pitch": pitch,
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    try:
        _client.emit("signal", payload)
        return True
    except Exception as e:
        print(f"[WARN] signal emit failed: {e}")
        _connected = False
        return False


def disconnect() -> None:
    """Close the Socket.io connection cleanly."""
    global _connected
    try:
        _client.disconnect()
    except Exception:
        pass
    _connected = False
