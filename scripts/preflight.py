#!/usr/bin/env python3
"""Pre-flight check: verifies PostgreSQL and Redis are reachable before the backend starts."""

import os
import re
import socket
import sys
from pathlib import Path


def load_env(env_file: Path) -> dict[str, str]:
    """Parse a .env file into a dict without external dependencies."""
    env: dict[str, str] = {}
    if not env_file.exists():
        return env
    for line in env_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        env[key.strip()] = value.strip().strip('"').strip("'")
    return env


def parse_host_port(url: str, default_port: int) -> tuple[str, int]:
    """Extract host and port from a connection URL (handles user:pass@host:port patterns)."""
    match = re.search(r"@([^:/]+):(\d+)", url)
    if match:
        return match.group(1), int(match.group(2))
    match = re.search(r"://([^:/]+):(\d+)", url)
    if match:
        return match.group(1), int(match.group(2))
    match = re.search(r"://([^:/\s]+)", url)
    if match:
        return match.group(1), default_port
    return "localhost", default_port


def check_port(host: str, port: int, timeout: float = 2.0) -> bool:
    """Return True if a TCP connection to host:port succeeds within the timeout."""
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except (ConnectionRefusedError, TimeoutError, OSError):
        return False


def main() -> None:
    env_path = Path(__file__).resolve().parent.parent / ".env"
    env = load_env(env_path)

    # Real environment variables take precedence over .env file values
    database_url = os.environ.get("DATABASE_URL") or env.get("DATABASE_URL", "")
    redis_url = os.environ.get("REDIS_URL") or env.get("REDIS_URL", "")

    errors: list[str] = []

    if not database_url:
        errors.append("  • DATABASE_URL is not set — copy .env.example to .env and fill in values")
    else:
        pg_host, pg_port = parse_host_port(database_url, 5432)
        if not check_port(pg_host, pg_port):
            errors.append(
                f"  • PostgreSQL is not reachable at {pg_host}:{pg_port}\n"
                f"    Make sure Docker Desktop is running, then:  docker compose up postgres -d"
            )

    if not redis_url:
        errors.append("  • REDIS_URL is not set — copy .env.example to .env and fill in values")
    else:
        redis_host, redis_port = parse_host_port(redis_url, 6379)
        if not check_port(redis_host, redis_port):
            errors.append(
                f"  • Redis is not reachable at {redis_host}:{redis_port}\n"
                f"    Make sure Docker Desktop is running, then:  docker compose up redis -d"
            )

    if errors:
        print("\n[preflight] Cannot start — required services are offline:\n", flush=True)
        for err in errors:
            print(err, flush=True)
        print(
            "\n  Start both at once:  docker compose up postgres redis -d\n",
            flush=True,
        )
        sys.exit(1)

    print("[preflight] PostgreSQL and Redis are reachable. Starting backend...\n", flush=True)


if __name__ == "__main__":
    main()
