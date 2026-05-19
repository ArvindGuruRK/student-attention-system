import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.session import ClassSession
from backend.models.signal import AttentionSignal
from backend.models.student import Student
from backend.schemas.session import SessionReport, StudentSessionStats


async def generate_session_report(session_id: uuid.UUID, db: AsyncSession) -> SessionReport:
    """Aggregate per-student stats and a minute-by-minute timeline for a session."""
    session_result = await db.execute(select(ClassSession).where(ClassSession.id == session_id))
    session = session_result.scalar_one_or_none()
    if not session:
        raise ValueError(f"Session {session_id} not found")

    signals_result = await db.execute(
        select(AttentionSignal)
        .where(AttentionSignal.session_id == session_id)
        .order_by(AttentionSignal.timestamp)
    )
    signals = signals_result.scalars().all()

    students_result = await db.execute(
        select(Student).where(Student.classroom_id == session.classroom_id)
    )
    name_map = {str(s.id): s.name for s in students_result.scalars().all()}

    # Group signals by student
    by_student: dict[str, list[AttentionSignal]] = {}
    for sig in signals:
        by_student.setdefault(str(sig.student_id), []).append(sig)

    student_stats: list[StudentSessionStats] = []
    all_scores: list[int] = []

    for sid, sigs in by_student.items():
        scores = [s.attention_score for s in sigs]
        all_scores.extend(scores)
        avg = round(sum(scores) / len(scores), 1) if scores else 0.0
        alert_count = sum(1 for s in scores if s < 40)

        flag_freq: dict[str, int] = {}
        for sig in sigs:
            for f in (sig.flags or []):
                flag_freq[f] = flag_freq.get(f, 0) + 1
        top_flags = sorted(flag_freq, key=lambda f: -flag_freq[f])[:3]

        student_stats.append(StudentSessionStats(
            student_id=uuid.UUID(sid),
            student_name=name_map.get(sid, "Unknown"),
            avg_score=avg,
            min_score=min(scores, default=0),
            max_score=max(scores, default=0),
            alert_count=alert_count,
            top_flags=top_flags,
        ))

    started = _ensure_tz(session.started_at)
    ended = _ensure_tz(session.ended_at) if session.ended_at else datetime.now(timezone.utc)
    duration_minutes = round((ended - started).total_seconds() / 60, 1)
    class_avg = round(sum(all_scores) / len(all_scores), 1) if all_scores else 0.0
    at_risk_count = sum(1 for s in student_stats if s.avg_score < 60)

    return SessionReport(
        session_id=session_id,
        classroom_id=session.classroom_id,
        started_at=session.started_at,
        ended_at=session.ended_at,
        duration_minutes=duration_minutes,
        class_avg=class_avg,
        at_risk_count=at_risk_count,
        student_stats=student_stats,
        timeline=_build_timeline(signals, started),
    )


def _build_timeline(signals: list[AttentionSignal], started_at: datetime) -> list[dict]:
    """Build a per-minute average attention score list from raw signals."""
    buckets: dict[int, list[int]] = {}
    for sig in signals:
        ts = _ensure_tz(sig.timestamp)
        minute = int((ts - started_at).total_seconds() // 60)
        buckets.setdefault(minute, []).append(sig.attention_score)
    return [
        {"minute": m, "avg_score": round(sum(v) / len(v), 1)}
        for m, v in sorted(buckets.items())
    ]


def _ensure_tz(dt: datetime) -> datetime:
    """Attach UTC timezone if the datetime is naive."""
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
