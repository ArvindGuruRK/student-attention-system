# CLAUDE.md — Student Attention Monitor

> This file documents the project architecture and serves as the instruction set for AI-assisted development with [Claude Code](https://claude.ai/code). It is intentionally committed to the repository so any contributor (human or AI) has full context.

## Project Context

A real-time AI attention monitoring system for classrooms. Evolved from a working POC
(Python/SQLite/vanilla JS) to a fullstack MVP targeting real classroom deployments.
The POC validated the core CV pipeline (MediaPipe face detection, head pose estimation,
WebSocket alerting).

**Architecture decisions made in the MVP:**

- Backend: Python FastAPI (kept) + PostgreSQL + SQLAlchemy (replaces SQLite)
- Frontend: Next.js 15 App Router (replaces vanilla HTML/JS)
- Real-time: Socket.io (replaces raw WebSocket) with Redis pub/sub for multi-instance
- Auth: JWT-based teacher login + per-student session tokens
- CV Engine: Stays Python, now containerized and decoupled from the API server
- Infra: Docker Compose for local dev (single `docker compose up` to run everything)

---

## Tech Stack

| Layer            | Technology                                                 |
| ---------------- | ---------------------------------------------------------- |
| Frontend         | Next.js 15 (App Router), TypeScript, Tailwind CSS          |
| UI Components    | shadcn/ui                                                  |
| Charts           | Recharts                                                   |
| Backend API      | Python 3.11+, FastAPI, Uvicorn                             |
| Real-time        | Socket.io (Python: python-socketio, JS: socket.io-client)  |
| CV Engine        | MediaPipe, OpenCV, NumPy (runs as a separate process)      |
| Database         | PostgreSQL 15 via asyncpg + SQLAlchemy (async)             |
| ORM / Migrations | SQLAlchemy 2.0 (async) + Alembic                           |
| Cache / Pub-Sub  | Redis 7 (rolling signal buffer + Socket.io adapter)        |
| Auth             | JWT (python-jose) + bcrypt password hashing                |
| Config           | python-dotenv (.env file)                                  |
| Dev Infra        | Docker Compose (postgres, redis)                           |

---

## Folder Structure

```
student-attention-system/
├── CLAUDE.md                        ← you are here
├── .env                             ← all secrets and config (never commit)
├── .env.example                     ← template for .env
├── docker-compose.yml               ← spins up all services locally
├── README.md                        ← setup and run instructions
│
├── backend/                         ← FastAPI application
│   ├── main.py                      ← app factory, mounts routers, Socket.io
│   ├── config.py                    ← settings via pydantic-settings
│   ├── database.py                  ← async SQLAlchemy engine + session factory
│   ├── redis_client.py              ← Redis connection and pub/sub helpers
│   │
│   ├── models/                      ← SQLAlchemy ORM models
│   │   ├── __init__.py
│   │   ├── teacher.py               ← Teacher (id, email, hashed_password, name)
│   │   ├── classroom.py             ← Classroom (id, teacher_id, name, thresholds)
│   │   ├── session.py               ← ClassSession (id, classroom_id, started_at, ended_at)
│   │   ├── student.py               ← Student (id, classroom_id, name, session_token)
│   │   └── signal.py                ← AttentionSignal (id, session_id, student_id, score, flags, ts)
│   │
│   ├── schemas/                     ← Pydantic request/response schemas
│   │   ├── __init__.py
│   │   ├── auth.py                  ← LoginRequest, TokenResponse
│   │   ├── classroom.py             ← ClassroomCreate, ClassroomOut
│   │   ├── session.py               ← SessionCreate, SessionOut, SessionReport
│   │   ├── student.py               ← StudentCreate, StudentOut
│   │   └── signal.py                ← SignalIn, SignalOut, AlertPayload
│   │
│   ├── routers/                     ← FastAPI route handlers
│   │   ├── __init__.py
│   │   ├── auth.py                  ← POST /auth/login, POST /auth/register
│   │   ├── classrooms.py            ← CRUD for classrooms
│   │   ├── sessions.py              ← start/end session, get report
│   │   ├── students.py              ← add students, get student detail
│   │   └── signals.py               ← ingest signals (REST fallback), get history
│   │
│   ├── services/                    ← business logic layer
│   │   ├── __init__.py
│   │   ├── auth_service.py          ← JWT creation, password hashing
│   │   ├── attention_service.py     ← EMA scoring, alert detection, threshold logic
│   │   ├── report_service.py        ← post-session analytics aggregation
│   │   └── redis_service.py         ← rolling buffer reads/writes, pub/sub
│   │
│   ├── socketio_handlers/           ← Socket.io event handlers
│   │   ├── __init__.py
│   │   ├── student_events.py        ← "join_session", "signal" events from students
│   │   └── teacher_events.py        ← "join_classroom", "pause_monitoring" from teacher
│   │
│   └── migrations/                  ← Alembic migration files
│       ├── env.py
│       ├── alembic.ini
│       └── versions/                ← auto-generated migration scripts
│
├── frontend/                        ← Next.js 15 App Router application
│   ├── package.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   │
│   ├── app/
│   │   ├── layout.tsx               ← root layout (fonts, providers)
│   │   ├── page.tsx                 ← redirect to /login or /dashboard
│   │   │
│   │   ├── (auth)/
│   │   │   └── login/
│   │   │       └── page.tsx         ← teacher login form
│   │   │
│   │   ├── dashboard/
│   │   │   ├── layout.tsx           ← sidebar + nav shell
│   │   │   ├── page.tsx             ← overview: list of classrooms + active sessions
│   │   │   │
│   │   │   ├── classrooms/
│   │   │   │   ├── page.tsx         ← list + create classrooms
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx     ← classroom detail + manage students
│   │   │   │
│   │   │   ├── sessions/
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── live/
│   │   │   │   │   │   └── page.tsx ← LIVE teacher dashboard (main view)
│   │   │   │   │   └── report/
│   │   │   │   │       └── page.tsx ← post-session analytics report
│   │   │   │   └── page.tsx         ← session history list
│   │   │   │
│   │   │   └── settings/
│   │   │       └── page.tsx         ← thresholds, profile
│   │   │
│   │   └── student/
│   │       └── [token]/
│   │           └── page.tsx         ← student monitoring page (camera + status)
│   │
│   ├── components/
│   │   ├── ui/                      ← shadcn/ui primitives
│   │   ├── dashboard/
│   │   │   ├── StudentGrid.tsx      ← live color-coded student tile grid
│   │   │   ├── StudentTile.tsx      ← individual student card with score + flags
│   │   │   ├── AlertLog.tsx         ← real-time scrolling alert feed
│   │   │   ├── ClassStats.tsx       ← class average, at-risk count, trend
│   │   │   └── AttentionChart.tsx   ← Recharts line chart (class avg over time)
│   │   ├── report/
│   │   │   ├── SessionTimeline.tsx  ← minute-by-minute class attention chart
│   │   │   ├── StudentCard.tsx      ← per-student sparkline + top flags
│   │   │   └── ExportButton.tsx     ← trigger PDF / CSV download
│   │   └── student/
│   │       ├── CameraFeed.tsx       ← video element + MediaPipe WASM (browser-side)
│   │       └── StatusIndicator.tsx  ← shows student their own attention status
│   │
│   ├── lib/
│   │   ├── api.ts                   ← typed fetch wrapper for all REST calls
│   │   ├── socket.ts                ← Socket.io client singleton
│   │   ├── auth.ts                  ← JWT storage + auth helpers
│   │   └── utils.ts                 ← cn(), formatters, score → color mapping
│   │
│   └── hooks/
│       ├── useSocket.ts             ← subscribe to Socket.io events
│       ├── useLiveSession.ts        ← aggregates live student states from socket
│       └── useMediaPipe.ts          ← runs MediaPipe WASM in browser, emits signals
│
└── scripts/
    ├── seed_db.py                   ← creates demo teacher + classroom + students
    └── load_test.py                 ← simulates N students sending signals
```

---

## Database Schema

### teachers

| Column          | Type        | Notes           |
| --------------- | ----------- | --------------- |
| id              | UUID PK     |                 |
| email           | VARCHAR 255 | unique, indexed |
| hashed_password | TEXT        | bcrypt          |
| name            | VARCHAR 100 |                 |
| created_at      | TIMESTAMPTZ | default now()   |

### classrooms

| Column          | Type        | Notes                         |
| --------------- | ----------- | ----------------------------- |
| id              | UUID PK     |                               |
| teacher_id      | UUID FK     | → teachers.id                 |
| name            | VARCHAR 100 |                               |
| yaw_threshold   | INT         | default 30                    |
| pitch_threshold | INT         | default 25                    |
| alert_threshold | INT         | score below this = alert (40) |
| warn_threshold  | INT         | score below this = warn (60)  |
| created_at      | TIMESTAMPTZ |                               |

### students

| Column        | Type        | Notes                       |
| ------------- | ----------- | --------------------------- |
| id            | UUID PK     |                             |
| classroom_id  | UUID FK     | → classrooms.id             |
| name          | VARCHAR 100 |                             |
| session_token | VARCHAR 64  | unique, shared with student |
| created_at    | TIMESTAMPTZ |                             |

### class_sessions

| Column       | Type        | Notes                    |
| ------------ | ----------- | ------------------------ |
| id           | UUID PK     |                          |
| classroom_id | UUID FK     | → classrooms.id          |
| started_at   | TIMESTAMPTZ |                          |
| ended_at     | TIMESTAMPTZ | null = session is active |

### attention_signals

| Column          | Type        | Notes                       |
| --------------- | ----------- | --------------------------- |
| id              | BIGINT PK   | auto-increment              |
| session_id      | UUID FK     | → class_sessions.id         |
| student_id      | UUID FK     | → students.id               |
| attention_score | SMALLINT    | 0–100                       |
| flags           | TEXT[]      | e.g. ["gaze_away","drowsy"] |
| yaw             | REAL        |                             |
| pitch           | REAL        |                             |
| timestamp       | TIMESTAMPTZ | indexed                     |

**Index:** `(session_id, student_id, timestamp)` — covers all analytics queries.

---

## Core Logic — How It Works

### Student flow — Browser-side MediaPipe

1. Student opens `/student/[token]`
2. Browser requests camera permission
3. `useMediaPipe` hook runs MediaPipe Face Mesh WASM in-browser
4. Extracts EAR, gaze deviation, head pitch every 3 seconds
5. Converts to attention score (0–100) locally
6. Emits `signal` event via Socket.io to backend
7. No video ever leaves the browser

### Attention Scoring (attention_service.py)

- Maintain a rolling window of the last 20 signals per student in Redis (1 minute @ 3s intervals)
- Compute EMA (α = 0.3) over the window to smooth noise
- Map score to status:
  - `≥ 80` → `attentive` (green)
  - `60–79` → `distracted` (yellow)
  - `40–59` → `at_risk` (orange)
  - `< 40` → `alert` (red, auto-notify teacher)
- Track state transitions: only emit `ALERT` when crossing the threshold (not on every signal)
- `RECOVERED` event fires when score returns above `warn_threshold` after being in alert state

### Real-time broadcasting (Socket.io rooms)

- Each classroom session has a Socket.io room: `session:{session_id}`
- Students join their session room on connect; teachers join the same room as observers
- On every signal: backend updates Redis buffer, recomputes EMA, then:
  - If score changed significantly (>5 points) → broadcast `STATUS_UPDATE` to room
  - If alert threshold crossed → broadcast `ALERT` to room
- Every 5 seconds: aggregator broadcasts `SESSION_SNAPSHOT` (all student scores at once)
- This prevents dashboard flooding while keeping latency acceptable

---

## WebSocket / Socket.io Event Reference

### Events emitted BY students (to backend)

```json
// Event: "signal"
{
  "session_id": "uuid",
  "student_id": "uuid",
  "token": "session_token_string",
  "attention_score": 72,
  "flags": ["gaze_away"],
  "yaw": 12.5,
  "pitch": -8.1,
  "timestamp": "2025-05-13T10:15:32Z"
}
```

```json
// Event: "join_session"
{
  "token": "session_token_string"
}
```

### Events emitted BY teachers (to backend)

```json
// Event: "join_classroom"
{
  "session_id": "uuid",
  "teacher_jwt": "Bearer eyJ..."
}
```

```json
// Event: "pause_monitoring"
{
  "session_id": "uuid",
  "duration_seconds": 120
}
```

### Events emitted BY backend (to teacher dashboard)

```json
// Event: "STATUS_UPDATE" — single student update
{
  "type": "STATUS_UPDATE",
  "student_id": "uuid",
  "student_name": "Ravi Kumar",
  "status": "attentive",
  "attention_score": 87,
  "flags": [],
  "yaw": 5.2,
  "pitch": -3.1,
  "timestamp": "2025-05-13T10:32:05Z"
}
```

```json
// Event: "ALERT" — threshold crossed
{
  "type": "ALERT",
  "student_id": "uuid",
  "student_name": "Ravi Kumar",
  "alert_type": "DISTRACTED",
  "attention_score": 38,
  "flags": ["gaze_away", "head_tilt"],
  "timestamp": "2025-05-13T10:32:00Z"
}
```

```json
// Event: "SESSION_SNAPSHOT" — full class state, sent every 5s
{
  "type": "SESSION_SNAPSHOT",
  "session_id": "uuid",
  "class_avg": 72.4,
  "at_risk_count": 3,
  "students": [
    {
      "student_id": "uuid",
      "student_name": "Ravi Kumar",
      "status": "attentive",
      "attention_score": 87,
      "flags": [],
      "trend": "stable"
    }
  ],
  "timestamp": "2025-05-13T10:32:10Z"
}
```

---

## REST API Endpoints

### Auth

```
POST   /api/auth/register          → create teacher account
POST   /api/auth/login             → returns JWT access token
```

### Classrooms

```
GET    /api/classrooms             → list teacher's classrooms
POST   /api/classrooms             → create classroom
GET    /api/classrooms/{id}        → get classroom + students
PATCH  /api/classrooms/{id}        → update thresholds/name
DELETE /api/classrooms/{id}        → soft delete
```

### Students

```
POST   /api/classrooms/{id}/students       → add student, returns session_token
GET    /api/classrooms/{id}/students       → list students
DELETE /api/students/{id}                  → remove student
```

### Sessions

```
POST   /api/sessions/start                 → starts session for a classroom
POST   /api/sessions/{id}/end             → ends session, triggers report generation
GET    /api/sessions/{id}/report          → returns full analytics report
GET    /api/sessions/{id}/export/pdf      → streams PDF report
GET    /api/sessions/{id}/export/csv      → streams CSV of all signals
GET    /api/classrooms/{id}/sessions      → session history for a classroom
```

### Signals (REST fallback, used when WebSocket is unavailable)

```
POST   /api/signals                        → ingest single signal (auth via token)
GET    /api/sessions/{id}/signals          → paginated signal history
GET    /api/students/{id}/signals          → student signal history for a session
```

---

## Environment Variables (.env)

```bash
# App
APP_ENV=development
SECRET_KEY=change_me_in_production_use_openssl_rand_hex_32
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=480

# Database
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/attention_monitor

# Redis
REDIS_URL=redis://localhost:6379/0

# CV Thresholds
YAW_THRESHOLD=30
PITCH_THRESHOLD=25
NO_FACE_SECONDS=5
DISTRACTION_SECONDS=30
ATTENTION_WINDOW_SECONDS=60
EMA_ALPHA=0.3

# Alert Thresholds
ALERT_THRESHOLD=40
WARN_THRESHOLD=60

# Socket.io
SOCKETIO_CORS_ORIGINS=http://localhost:3000

# Frontend (Next.js)
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SOCKET_URL=http://localhost:8000
```

---

## Docker Compose Services

Docker manages infrastructure only. The backend and frontend run as local processes.

```yaml
services:
  postgres:   # PostgreSQL 15 — host port 5433 → container 5432
  redis:      # Redis 7 Alpine — host port 6380 → container 6379
```

Start infrastructure:  `docker compose up postgres redis -d`

---

## Key Rules for Claude Code

1. **One file at a time.** Complete each file fully before moving to the next.
2. **Always show full file content.** Never use `# ... rest of code` placeholders.
3. **Type hints everywhere.** All Python functions and TypeScript components must be typed.
4. **Async by default.** All DB calls must use `async/await` with SQLAlchemy async session. No sync DB calls.
5. **Services, not fat routes.** Route handlers call service functions. Business logic lives in `services/`.
6. **Error handling.** FastAPI routes use `HTTPException`. CV engine wraps frame processing in try/except. Next.js uses error boundaries.
7. **Pydantic validation.** All request bodies validated by Pydantic schemas. Never trust raw dicts from the client.
8. **Socket.io events follow the exact payload formats defined above.** Do not invent new event names.
9. **Redis for hot data only.** Rolling signal buffer and session state go in Redis. Everything persists to PostgreSQL.
10. **No hardcoded secrets.** All config values come from `config.py` which reads from `.env`.
11. **Comments on every function.** One-line docstring or comment explaining what each function does.
12. **JWT on all teacher routes.** Every `/api/*` route (except `/api/auth/*`) requires `Authorization: Bearer <token>`. Student signal routes authenticate via `session_token`.

---

## MVP Scope Boundaries (what's IN vs OUT)

### ✅ In scope for MVP

- Teacher registration + login (JWT)
- Create/manage classrooms and students
- Generate per-student session tokens (shared as URLs)
- Live teacher dashboard with student grid, alert log, class stats
- Real-time signals via Socket.io (browser MediaPipe + Python CV engine)
- Attention scoring with EMA smoothing
- Alert detection with state transition logic (not per-signal spam)
- Post-session report: class timeline chart + per-student breakdown
- PDF export of session report (server-rendered)
- CSV export of raw signals
- Docker Compose local dev setup

### ❌ Out of scope for MVP (future phases)

- Multi-teacher organizations / team accounts
- LMS integrations (Google Classroom, Moodle)
- Mobile app
- Video recording or screenshots
- Proctoring / cheating detection beyond attention signals
- Payment / subscriptions
- Email notifications
- Tamil / regional language UI
- HTTPS / production deployment (document in README, not implemented)

---

## POC → MVP Delta Summary

| Concern      | POC                | MVP                                          |
| ------------ | ------------------ | -------------------------------------------- |
| Database     | SQLite (file)      | PostgreSQL 15 (async, Docker)                |
| Auth         | None               | JWT (teacher login + student tokens)         |
| Frontend     | Vanilla HTML/JS    | Next.js 14 + TypeScript + Tailwind           |
| Real-time    | Raw WebSocket      | Socket.io + Redis pub/sub                    |
| CV execution | Single script      | Decoupled process OR browser WASM            |
| Scaling      | Single process     | Horizontal via Redis adapter                 |
| Reports      | None               | PDF + CSV export                             |
| Data model   | Flat alerts table  | Relational: teacher→classroom→session→signal |
| Config       | .env vars          | Pydantic Settings with validation            |
| Dev setup    | Manual pip install | Docker Compose single command                |

---

## How to Run

Docker manages only PostgreSQL and Redis. The backend (FastAPI) and frontend (Next.js) run as local processes via `npm run dev`.

```bash
# 1. Clone and configure
cp .env.example .env
# Generate a strong key: openssl rand -hex 32

# 2. Install backend dependencies
cd backend && python -m venv venv
venv\Scripts\activate && pip install -r requirements.txt && cd ..

# 3. Install frontend + root dependencies
npm install && npm install --prefix frontend

# 4. Start infrastructure
docker compose up postgres redis -d

# 5. Run database migrations (first time only)
backend/venv/Scripts/python -m alembic -c backend/migrations/alembic.ini upgrade head

# 6. Seed demo data
backend/venv/Scripts/python scripts/seed_db.py

# 7. Start backend + frontend together
npm run dev
# Teacher dashboard: http://localhost:3000
# Backend API docs:  http://localhost:8000/docs
# Demo login:        teacher@demo.com / demo1234
```

If Docker Desktop is not running when you do `npm run dev`, the backend exits immediately with a message telling you which services to start — no silent failures.
