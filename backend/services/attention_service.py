"""
Ported and extended from backend/alert_engine_poc.py.
Adds EMA smoothing, per-classroom thresholds, and state-transition-only alerting.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional

from backend.config import settings


def compute_ema(scores: list[int], alpha: float = settings.ema_alpha) -> float:
    """Apply exponential moving average over the score window; newest signal has highest weight."""
    if not scores:
        return 100.0
    ema = float(scores[0])
    for score in scores[1:]:
        ema = alpha * score + (1 - alpha) * ema
    return round(ema, 2)


def score_to_status(score: float, alert_threshold: int, warn_threshold: int) -> str:
    """Map a numeric EMA score to a status label using per-classroom thresholds."""
    if score >= 80:
        return "attentive"
    elif score >= warn_threshold:
        return "distracted"
    elif score >= alert_threshold:
        return "at_risk"
    else:
        return "alert"


def should_fire_alert(
    current_status: str,
    previous_status: Optional[str],
) -> Optional[str]:
    """
    Return an alert_type string only when a meaningful threshold crossing occurs.
    Fires once per transition, not on every signal — mirrors POC alert_engine logic.
    """
    if current_status == "alert" and previous_status not in ("alert",):
        return "DISTRACTED"
    if previous_status in ("alert", "at_risk") and current_status in ("attentive", "distracted"):
        return "RECOVERED"
    return None


def apply_phone_penalty(raw_score: int, flags: list[str]) -> int:
    """Subtract 30 from the raw score when phone_detected is flagged, floored at 0. Call before EMA."""
    if "phone_detected" in flags:
        return max(0, raw_score - 30)
    return raw_score


def should_fire_phone_alert(
    flags: list[str],
    previous_flags: Optional[list[str]],
) -> bool:
    """Return True only on the first signal where phone_detected appears (transition, not every signal)."""
    return "phone_detected" in flags and (
        previous_flags is None or "phone_detected" not in previous_flags
    )


def build_status_update_payload(
    student_id: uuid.UUID,
    student_name: str,
    status: str,
    ema_score: float,
    flags: list[str],
    yaw: Optional[float],
    pitch: Optional[float],
) -> dict:
    """Build a STATUS_UPDATE Socket.io payload per the event spec."""
    return {
        "type": "STATUS_UPDATE",
        "student_id": str(student_id),
        "student_name": student_name,
        "status": status,
        "attention_score": round(ema_score),
        "flags": flags,
        "yaw": yaw,
        "pitch": pitch,
        "timestamp": _now_iso(),
    }


def build_alert_payload(
    student_id: uuid.UUID,
    student_name: str,
    alert_type: str,
    ema_score: float,
    flags: list[str],
) -> dict:
    """Build an ALERT Socket.io payload per the event spec."""
    return {
        "type": "ALERT",
        "student_id": str(student_id),
        "student_name": student_name,
        "alert_type": alert_type,
        "attention_score": round(ema_score),
        "flags": flags,
        "timestamp": _now_iso(),
    }


def build_session_snapshot(
    session_id: str,
    student_scores: dict[str, float],
    student_names: dict[str, str],
    student_statuses: dict[str, str],
    student_flags: Optional[dict[str, list[str]]] = None,
) -> dict:
    """Build a SESSION_SNAPSHOT payload broadcast every 5 seconds to the teacher dashboard."""
    scores = list(student_scores.values())
    class_avg = round(sum(scores) / len(scores), 1) if scores else 0.0
    at_risk_count = sum(1 for s in student_statuses.values() if s in ("at_risk", "alert"))
    _flags = student_flags or {}

    return {
        "type": "SESSION_SNAPSHOT",
        "session_id": session_id,
        "class_avg": class_avg,
        "at_risk_count": at_risk_count,
        "students": [
            {
                "student_id": sid,
                "student_name": student_names.get(sid, "Unknown"),
                "status": student_statuses.get(sid, "attentive"),
                "attention_score": round(student_scores.get(sid, 100.0)),
                "flags": _flags.get(sid, []),
                "trend": "stable",
            }
            for sid in student_scores
        ],
        "timestamp": _now_iso(),
    }


def _now_iso() -> str:
    """Return current UTC time as ISO8601 string."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
