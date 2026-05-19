# Student Attention Monitor

Real-time AI-powered attention tracking for classrooms. Teachers get a live dashboard showing each student's attention score as it updates. Students open a link on their device — no app install required.

---

## How It Works

- Students open a token URL (`/student/[token]`) in their browser
- Browser-side MediaPipe runs face detection and head pose estimation locally — **no video ever leaves the device**
- Attention scores (0–100) are computed from gaze deviation, head angles, and face presence
- Scores stream to the teacher dashboard via Socket.io in real time
- Teachers see color-coded student tiles, alerts when anyone drops below threshold, and a class-average trend chart
- After class ends, a full session report is generated with per-student breakdowns and PDF/CSV export

---

## Tech Stack

| Layer       | Technology                                              |
|-------------|--------------------------------------------------------|
| Frontend    | Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Recharts |
| Real-time   | Socket.io (python-socketio + socket.io-client)          |
| Backend API | Python 3.11+, FastAPI, Uvicorn                          |
| CV Engine   | MediaPipe, OpenCV (optional — runs server-side or in browser) |
| Database    | PostgreSQL 15 via asyncpg + SQLAlchemy 2.0 (async)      |
| Cache       | Redis 7 (rolling signal buffer + Socket.io adapter)     |
| Auth        | JWT (teacher login) + per-student session tokens        |
| Dev Infra   | Docker Compose                                          |

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — for PostgreSQL and Redis
- Python 3.11+
- Node.js 20+

---

## Setup

### 1. Clone and configure

```bash
git clone https://github.com/your-username/student-attention-system.git
cd student-attention-system

cp .env.example .env
# Open .env and set a strong SECRET_KEY:
#   openssl rand -hex 32
```

### 2. Install backend dependencies

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
cd ..
```

### 3. Install frontend and root dependencies

```bash
npm install                    # installs concurrently at the root
npm install --prefix frontend  # installs Next.js and all frontend packages
```

### 4. Start infrastructure (PostgreSQL + Redis)

```bash
docker compose up postgres redis -d
```

### 5. Run database migrations (first time only)

```bash
backend/venv/Scripts/python -m alembic -c backend/migrations/alembic.ini upgrade head
```

### 6. Seed demo data (optional)

```bash
backend/venv/Scripts/python scripts/seed_db.py
```

### 7. Start the dev servers

```bash
npm run dev
```

This starts the FastAPI backend (port 8000) and Next.js frontend (port 3000) together in one terminal. If Docker Desktop isn't running or the containers are stopped, the backend will exit immediately with a clear message telling you exactly what to start.

| Service            | URL                          |
|--------------------|------------------------------|
| Teacher dashboard  | http://localhost:3000        |
| API docs (Swagger) | http://localhost:8000/docs   |
| Demo login         | teacher@demo.com / demo1234  |

---

## CV Engine (Optional — Server-side Camera)

By default, attention signals are computed in the student's browser using MediaPipe WASM — no video leaves their device. For lab deployments where you want server-side processing instead:

```bash
cd cv_engine
pip install -r requirements.txt
python main.py --token <student_session_token>
```

Get the student token from the teacher dashboard under **Classrooms → [Classroom] → Students**.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in your values.

| Variable                   | Default                                   | Description                                  |
|----------------------------|-------------------------------------------|----------------------------------------------|
| `SECRET_KEY`               | *(required)*                              | JWT signing key — use `openssl rand -hex 32` |
| `DATABASE_URL`             | `postgresql+asyncpg://...@localhost:5432` | PostgreSQL connection string                 |
| `REDIS_URL`                | `redis://localhost:6379/0`                | Redis connection string                      |
| `JWT_EXPIRE_MINUTES`       | `480`                                     | Token expiry (8 hours)                       |
| `YAW_THRESHOLD`            | `30`                                      | Max head turn (degrees) before flagging      |
| `PITCH_THRESHOLD`          | `25`                                      | Max head tilt (degrees) before flagging      |
| `ALERT_THRESHOLD`          | `40`                                      | Score below this triggers an alert           |
| `WARN_THRESHOLD`           | `60`                                      | Score below this shows a warning             |
| `SOCKETIO_CORS_ORIGINS`    | `http://localhost:3000`                   | Allowed CORS origins for Socket.io           |
| `NEXT_PUBLIC_API_URL`      | `http://localhost:8000`                   | Backend URL (read by Next.js)                |
| `NEXT_PUBLIC_SOCKET_URL`   | `http://localhost:8000`                   | Socket.io server URL (read by Next.js)       |

---

## Project Structure

```
student-attention-system/
├── backend/                  ← FastAPI application
│   ├── main.py               ← app factory, Socket.io mount
│   ├── config.py             ← Pydantic settings
│   ├── models/               ← SQLAlchemy ORM models
│   ├── schemas/              ← Pydantic request/response schemas
│   ├── routers/              ← REST API route handlers
│   ├── services/             ← business logic (scoring, auth, reports)
│   ├── socketio_handlers/    ← Socket.io event handlers
│   └── migrations/           ← Alembic migration scripts
│
├── cv_engine/                ← Python CV process (server-side option)
│   ├── face_detector.py
│   ├── head_pose.py
│   ├── attention_scorer.py
│   ├── signal_emitter.py
│   └── main.py
│
├── frontend/                 ← Next.js 15 app
│   ├── app/                  ← App Router pages
│   ├── components/           ← UI components (dashboard, report, student)
│   ├── hooks/                ← useSocket, useLiveSession, useMediaPipe
│   └── lib/                  ← api.ts, socket.ts, auth.ts, utils.ts
│
├── scripts/
│   ├── seed_db.py            ← demo teacher + classroom + students
│   └── load_test.py          ← simulate N students sending signals
│
├── docker-compose.yml
├── .env.example
└── CLAUDE.md                 ← architecture reference + AI dev instructions
```

---

## REST API Reference

Full interactive docs available at `http://localhost:8000/docs` when the server is running.

### Auth
```
POST /api/auth/register    Create a teacher account
POST /api/auth/login       Get JWT access token
```

### Classrooms
```
GET    /api/classrooms          List your classrooms
POST   /api/classrooms          Create a classroom
GET    /api/classrooms/{id}     Classroom detail + students
PATCH  /api/classrooms/{id}     Update thresholds/name
DELETE /api/classrooms/{id}     Delete classroom
```

### Sessions
```
POST /api/sessions/start            Start a session for a classroom
POST /api/sessions/{id}/end         End session + generate report
GET  /api/sessions/{id}/report      Full analytics report
GET  /api/sessions/{id}/export/pdf  Stream PDF report
GET  /api/sessions/{id}/export/csv  Stream CSV of raw signals
```

---

## Privacy

Student video never leaves their device. MediaPipe runs as WebAssembly in the browser. Only numeric scores and angle measurements are sent over the network.

---

## License

MIT
