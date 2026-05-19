"""
Load test: simulate N students sending attention signals to the backend.
Usage: python scripts/load_test.py --session-id <uuid> --tokens token1,token2,...
       or: python scripts/load_test.py --session-id <uuid> --count 5 (auto-fetches tokens)
"""
import argparse
import asyncio
import random
import uuid
from datetime import datetime, timezone

import socketio


def parse_args() -> argparse.Namespace:
    """Parse CLI arguments for the load test."""
    parser = argparse.ArgumentParser(description="Simulate student attention signals")
    parser.add_argument("--backend", default="http://localhost:8000", help="Backend URL")
    parser.add_argument("--session-id", required=True, help="Active session UUID")
    parser.add_argument("--tokens", default="", help="Comma-separated session tokens")
    parser.add_argument("--count", type=int, default=5, help="Number of simulated students")
    parser.add_argument("--duration", type=int, default=60, help="Test duration in seconds")
    parser.add_argument("--interval", type=float, default=3.0, help="Signal interval in seconds")
    return parser.parse_args()


async def simulate_student(
    backend: str,
    session_id: str,
    token: str,
    student_index: int,
    duration: float,
    interval: float,
) -> None:
    """Connect one simulated student and send random attention signals."""
    sio = socketio.AsyncSimpleClient()
    try:
        await sio.connect(backend)
        await sio.emit("join_session", {"token": token})
        print(f"[student-{student_index}] Connected and joined session")

        elapsed = 0.0
        while elapsed < duration:
            score = random.randint(30, 100)
            flags = []
            if score < 60:
                flags.append(random.choice(["gaze_away", "head_tilt", "no_face"]))

            await sio.emit("signal", {
                "session_id": session_id,
                "student_id": str(uuid.uuid4()),  # simulated
                "token": token,
                "attention_score": score,
                "flags": flags,
                "yaw": random.uniform(-45, 45),
                "pitch": random.uniform(-30, 30),
                "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            })
            await asyncio.sleep(interval)
            elapsed += interval

    except Exception as e:
        print(f"[student-{student_index}] Error: {e}")
    finally:
        await sio.disconnect()
        print(f"[student-{student_index}] Disconnected")


async def main() -> None:
    """Run all simulated students concurrently."""
    args = parse_args()
    tokens = [t.strip() for t in args.tokens.split(",") if t.strip()]

    if not tokens:
        print("[ERROR] No tokens provided. Use --tokens or seed the DB first.")
        return

    # Pad or trim tokens to match count
    while len(tokens) < args.count:
        tokens.append(tokens[0])
    tokens = tokens[: args.count]

    print(f"[load-test] Simulating {len(tokens)} students for {args.duration}s...")
    tasks = [
        simulate_student(args.backend, args.session_id, token, i, args.duration, args.interval)
        for i, token in enumerate(tokens)
    ]
    await asyncio.gather(*tasks)
    print("[load-test] Done.")


if __name__ == "__main__":
    asyncio.run(main())
