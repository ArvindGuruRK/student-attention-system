import os

YAW_THRESHOLD = float(os.getenv("YAW_THRESHOLD", 30))
PITCH_THRESHOLD = float(os.getenv("PITCH_THRESHOLD", 25))

# Maximum score deducted at the threshold angle; deduction scales linearly from 0°
_YAW_MAX_PENALTY = 50.0
_PITCH_MAX_PENALTY = 30.0


def compute_raw_score(
    face_present: bool,
    yaw: float | None,
    pitch: float | None,
) -> tuple[int, list[str]]:
    """
    Compute a continuous 0–100 attention score from CV outputs.
    Penalties scale proportionally with angle so the score changes smoothly
    as the student turns their head, rather than jumping between fixed values.
    Flags are set only when the angle meets or exceeds the configured threshold.
    """
    flags: list[str] = []

    if not face_present:
        return 0, ["no_face"]

    score = 100.0

    if yaw is not None:
        yaw_ratio = abs(yaw) / YAW_THRESHOLD
        score -= _YAW_MAX_PENALTY * yaw_ratio
        if yaw_ratio >= 1.0:
            flags.append("gaze_away")

    if pitch is not None:
        pitch_ratio = abs(pitch) / PITCH_THRESHOLD
        score -= _PITCH_MAX_PENALTY * pitch_ratio
        if pitch_ratio >= 1.0:
            flags.append("head_tilt")

    return max(0, round(score)), flags
