"""
CV Engine entry point — replaces student_monitor.py.
Reads webcam frames, runs face detection + head pose, and emits signals
to the backend via Socket.io every 3 seconds.

Usage:
    python -m cv_engine.main --token <session_token> [--camera 0]
"""
import argparse
import sys
import time

import cv2
from dotenv import load_dotenv

from cv_engine.face_detector import detect_face
from cv_engine.head_pose import estimate_head_pose
from cv_engine.attention_scorer import compute_raw_score
from cv_engine.signal_emitter import join_session, emit_signal, disconnect

load_dotenv()

EMIT_INTERVAL = 3.0  # seconds between signal emissions


def parse_args() -> argparse.Namespace:
    """Parse --token and --camera arguments."""
    parser = argparse.ArgumentParser(description="Student CV monitoring engine")
    parser.add_argument("--token", required=True, help="Student session token (from teacher dashboard)")
    parser.add_argument("--camera", type=int, default=0, help="Camera device index")
    return parser.parse_args()


def run(token: str, camera_index: int) -> None:
    """Main monitoring loop: capture → detect → score → emit every EMIT_INTERVAL seconds."""
    cap = cv2.VideoCapture(camera_index)
    if not cap.isOpened():
        print(f"[ERROR] Cannot open camera {camera_index}")
        sys.exit(1)

    print(f"[INFO] Joining session with token={token[:8]}...")
    join_result = join_session(token)
    if not join_result:
        print("[ERROR] Could not join session — check that a session is active and the token is valid.")
        cap.release()
        sys.exit(1)

    session_id, student_id = join_result
    print(f"[INFO] Joined session={session_id[:8]}... student={student_id[:8]}...")

    print("[INFO] Monitoring started. Press 'q' or Ctrl+C to stop.")
    last_emit = 0.0

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                time.sleep(0.05)
                continue

            yaw: float | None = None
            pitch: float | None = None
            face_present = False

            try:
                face_present, _ = detect_face(frame)
                if face_present:
                    pose = estimate_head_pose(frame)
                    if pose is not None:
                        yaw, pitch, _ = pose
            except Exception as e:
                print(f"[WARN] Frame processing error: {e}")

            score, flags = compute_raw_score(face_present, yaw, pitch)

            # Print live status
            status_label = "ATTENTIVE" if not flags else ("ABSENT" if "no_face" in flags else "DISTRACTED")
            yaw_str = f"{yaw:+.1f}" if yaw is not None else "N/A"
            pitch_str = f"{pitch:+.1f}" if pitch is not None else "N/A"
            print(
                f"\r[CV] {status_label:12s} | yaw={yaw_str:>7}° | pitch={pitch_str:>7}° | score={score:3d}",
                end="",
                flush=True,
            )

            # Emit every EMIT_INTERVAL seconds
            now = time.monotonic()
            if now - last_emit >= EMIT_INTERVAL:
                emit_signal(session_id, student_id, token, score, flags, yaw, pitch)
                last_emit = now

            # Overlay on preview window
            color = (0, 255, 0) if not flags else (0, 0, 255)
            cv2.putText(frame, f"{status_label} | {score}%", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
            cv2.imshow("CV Engine — Student Monitor", frame)
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break

    except KeyboardInterrupt:
        print("\n[INFO] Stopping.")
    finally:
        cap.release()
        cv2.destroyAllWindows()
        disconnect()
        print("[INFO] Session ended.")


if __name__ == "__main__":
    args = parse_args()
    run(token=args.token, camera_index=args.camera)
