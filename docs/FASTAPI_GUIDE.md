# FastAPI Learning Guide
### Built from the Student Attention Monitor codebase

This document teaches FastAPI and the Python concepts behind it using your own project as the
reference. Every code snippet is taken directly from this repo. Read it file-by-file.

---

## Table of Contents

1. [Python Fundamentals You Must Know First](#1-python-fundamentals-you-must-know-first)
2. [config.py — Settings and Environment Variables](#2-configpy--settings-and-environment-variables)
3. [database.py — Async Database Connection](#3-databasepy--async-database-connection)
4. [redis_client.py — Redis Singleton](#4-redis_clientpy--redis-singleton)
5. [models/ — SQLAlchemy ORM Models](#5-models--sqlalchemy-orm-models)
6. [schemas/ — Pydantic Validation Schemas](#6-schemas--pydantic-validation-schemas)
7. [services/ — Business Logic Layer](#7-services--business-logic-layer)
8. [routers/ — HTTP Route Handlers](#8-routers--http-route-handlers)
9. [socketio_handlers/ — Real-time Event Handlers](#9-socketio_handlers--real-time-event-handlers)
10. [main.py — App Factory and Lifespan](#10-mainpy--app-factory-and-lifespan)
11. [How a Request Flows End to End](#11-how-a-request-flows-end-to-end)
12. [Quick Reference Cheat Sheet](#12-quick-reference-cheat-sheet)

---

## 1. Python Fundamentals You Must Know First

Before reading any FastAPI code, you need to understand these Python features. They appear
everywhere in the codebase.

---

### 1.1 Type Hints

Python lets you annotate variables and function parameters with their expected type.
These are purely for readability and tooling (like mypy / pyright) — Python itself doesn't
enforce them at runtime.

```python
# Basic type hints
name: str = "Ravi"
score: int = 87
ratio: float = 0.3
is_active: bool = True

# Function parameter and return type hints
def add(a: int, b: int) -> int:
    return a + b

# Optional means the value can be that type OR None
from typing import Optional
ended_at: Optional[datetime] = None   # either a datetime, or None
```

In your project every function has full type hints. Example from `attention_service.py`:

```python
def compute_ema(scores: list[int], alpha: float = settings.ema_alpha) -> float:
    #             ^^^^^^^^^^^       ^^^^^^^^^^^                            ^^^^^
    #           param type        param type + default                 return type
```

---

### 1.2 async / await

Normal Python functions run one line at a time and block everything else while waiting.
`async def` functions can pause and let other code run while they wait (e.g., waiting for
a database query or a Redis call to come back).

```python
# Normal (blocking) — nothing else can happen while this sleeps
import time
def slow_function():
    time.sleep(2)       # blocks everything for 2 seconds
    return "done"

# Async (non-blocking) — other requests can be processed while this waits
import asyncio
async def fast_function():
    await asyncio.sleep(2)   # pauses THIS function, but other code keeps running
    return "done"
```

`await` means "pause here and wait for this async operation to finish".
You can only use `await` inside an `async def` function.

In your project, EVERY function that touches the database or Redis is `async`:

```python
# From database.py
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session           # pause: give the session to the route, resume on cleanup

# From auth.py router
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    result = await db.execute(...)   # pause: wait for PostgreSQL to respond
    teacher = result.scalar_one_or_none()
```

---

### 1.3 Decorators

A decorator is a function that wraps another function and adds behaviour to it.
The `@` symbol is the syntax for applying one.

```python
def my_decorator(func):
    def wrapper(*args, **kwargs):
        print("before")
        result = func(*args, **kwargs)
        print("after")
        return result
    return wrapper

@my_decorator
def say_hello():
    print("hello")

say_hello()
# Output:
# before
# hello
# after
```

FastAPI uses decorators to register routes:

```python
@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    ...
```

`@router.post("/login", ...)` is a decorator. It tells FastAPI: "when a POST request
comes in at /login, call the `login` function".

Socket.io uses the same pattern:

```python
@sio.event
async def join_session(sid: str, data: dict) -> None:
    ...
```

`@sio.event` tells Socket.io: "when a client emits a 'join_session' event, call this function".

---

### 1.4 Context Managers and `with`

A context manager handles setup and teardown automatically. The `with` statement ensures
cleanup always happens, even if an error occurs.

```python
# Without context manager — risky, file may not be closed on error
f = open("file.txt")
data = f.read()
f.close()    # what if read() raises an exception? close() never runs!

# With context manager — safe, close() always runs
with open("file.txt") as f:
    data = f.read()
# file is automatically closed here
```

In your project, the database session is a context manager:

```python
# From database.py
async def get_db():
    async with AsyncSessionLocal() as session:   # open session
        yield session                            # give it to the route
    # session is automatically closed here — even if the route raised an error
```

`async with` is the async version of `with`.

---

### 1.5 Generators and `yield`

A generator function uses `yield` instead of `return`. It produces a sequence of values
one at a time instead of returning them all at once.

```python
def count_to_three():
    yield 1
    yield 2
    yield 3

for n in count_to_three():
    print(n)
# Output: 1, 2, 3
```

`get_db()` in your project is a special kind of generator — it yields exactly once.
FastAPI uses this pattern for dependencies: yield the value, let the route run, then
continue after yield for cleanup.

```python
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session    # FastAPI takes this value and gives it to the route
    # cleanup runs here after the route finishes
```

---

### 1.6 f-strings

f-strings (formatted string literals) let you embed variables directly in strings.

```python
name = "Ravi"
score = 87
message = f"Student {name} scored {score} points"
# Result: "Student Ravi scored 87 points"

# You can run expressions inside {}
session_id = "abc-123"
key = f"signals:{session_id}:{student_id}"
```

Used everywhere in `redis_service.py` for building Redis keys:

```python
_SIGNAL_KEY = "signals:{session_id}:{student_id}"
key = _SIGNAL_KEY.format(session_id=session_id, student_id=student_id)
# Result: "signals:abc-123:xyz-456"
```

---

### 1.7 Dictionary Operations

```python
# Create
data = {"name": "Ravi", "score": 87}

# Access — raises KeyError if missing
name = data["name"]

# Access safely — returns None (or default) if missing
score = data.get("score", 0)   # returns 87
flags = data.get("flags", [])  # returns [] if "flags" not in data

# Spread dict into function keyword arguments
body = {"name": "CS101", "yaw_threshold": 30}
Classroom(**body)   # same as Classroom(name="CS101", yaw_threshold=30)
```

Used in the classroom router:

```python
classroom = Classroom(teacher_id=teacher.id, **body.model_dump())
# body.model_dump() returns {"name": "CS101", "yaw_threshold": 30, ...}
# **body.model_dump() spreads it as keyword arguments
```

---

### 1.8 List Comprehensions

A compact way to build a list from another sequence.

```python
# Long form
scores = []
for s in students:
    scores.append(s.score)

# List comprehension — same thing, one line
scores = [s.score for s in students]

# With condition
at_risk = [s for s in students if s.score < 60]
```

Used in `main.py` snapshot broadcaster and `redis_service.py`:

```python
# redis_service.py
return [int(v) for v in results[2]]    # convert bytes to int for each value

# attention_service.py
at_risk_count = sum(1 for s in student_statuses.values() if s in ("at_risk", "alert"))
```

---

### 1.9 `global` keyword

The `global` keyword lets a function modify a module-level variable.

```python
_counter = 0

def increment():
    global _counter        # without this, Python creates a LOCAL variable named _counter
    _counter += 1
```

Used in `redis_client.py`:

```python
_redis: aioredis.Redis | None = None    # module-level variable (None at start)

async def get_redis() -> aioredis.Redis:
    global _redis                        # we want to modify the module variable
    if _redis is None:
        _redis = aioredis.from_url(...)  # create once on first call
    return _redis                        # return the same instance every time
```

This is the **singleton pattern** — one shared connection instead of creating a new one
on every request.

---

### 1.10 `Optional` and Union Types

```python
from typing import Optional

# Optional[X] means "either X or None"
ended_at: Optional[datetime] = None

# Modern Python 3.10+ syntax — same thing
ended_at: datetime | None = None

# In your project, used for nullable DB columns
yaw: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
```

---

## 2. config.py — Settings and Environment Variables

**File:** [backend/config.py](backend/config.py)

```python
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

_ENV_FILE = Path(__file__).parent / ".env"
#           ^^^^^^^^^^^^^^^^^^^  ^^^^^^^^^^
#           directory of this file   + join ".env"
# Result: d:\...\backend\.env

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(_ENV_FILE), extra="ignore")

    secret_key: str = "change_me_in_production"
    jwt_expire_minutes: int = 480
    database_url: str = "postgresql+asyncpg://..."
    alert_threshold: int = 40

settings = Settings()
```

### What is `pydantic_settings`?

`BaseSettings` reads your `.env` file and maps each key to a class attribute.

If your `.env` file has:
```
SECRET_KEY=abc123
JWT_EXPIRE_MINUTES=60
```

Then:
```python
settings.secret_key       # → "abc123"
settings.jwt_expire_minutes  # → 60  (converted to int automatically)
```

### Key concepts here

| Concept | Code | Meaning |
|---|---|---|
| `Path(__file__).parent` | `Path(__file__).parent / ".env"` | Get directory of this Python file |
| Class inheritance | `class Settings(BaseSettings)` | Settings inherits all behaviour from BaseSettings |
| Default values | `alert_threshold: int = 40` | Used if key not found in .env |
| Module-level instance | `settings = Settings()` | Create ONE instance, import it everywhere |

### Why have a single `settings` object?

Every other file does `from backend.config import settings` and reads from it.
This means:
- One place to see all config
- No hardcoded values scattered across files
- Easy to change behaviour by editing `.env` without touching code

---

## 3. database.py — Async Database Connection

**File:** [backend/database.py](backend/database.py)

```python
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from backend.config import settings

# 1. Create the engine (the connection pool to PostgreSQL)
engine = create_async_engine(settings.database_url, echo=False, pool_pre_ping=True)

# 2. Create a session factory
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# 3. Base class — all ORM models inherit from this
class Base(DeclarativeBase):
    pass

# 4. Dependency function — gives one session per request
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session
```

### Understanding each part

**`create_async_engine`**

This is NOT a connection — it is a connection pool. A pool means SQLAlchemy keeps several
connections open and reuses them across requests instead of opening a new connection every time.

| Parameter | Meaning |
|---|---|
| `settings.database_url` | `postgresql+asyncpg://postgres:postgres@localhost:5432/attention_monitor` |
| `echo=False` | Don't print every SQL query to the terminal (set True for debugging) |
| `pool_pre_ping=True` | Test the connection before using it — prevents "connection closed" errors |

**`async_sessionmaker`**

A session is like a transaction. You open it, do your DB operations, then commit or rollback.
`async_sessionmaker` is a factory — calling it creates a new session.

| Parameter | Meaning |
|---|---|
| `class_=AsyncSession` | Use async sessions (compatible with `await`) |
| `expire_on_commit=False` | After `commit()`, keep the object data in memory (otherwise SQLAlchemy would clear it) |

**`class Base(DeclarativeBase): pass`**

Every ORM model (Teacher, Classroom, etc.) inherits from `Base`. SQLAlchemy uses this
to know which classes to map to database tables.

**`get_db()` — the dependency**

```python
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session
```

- `AsyncGenerator[AsyncSession, None]` means: this is an async generator that yields
  an `AsyncSession` and sends nothing back
- When FastAPI calls this, it gets a session via `yield`
- After the route finishes, execution resumes after `yield` and `async with` closes the session

### How a DB query works

```python
# Select example from auth.py
result = await db.execute(
    select(Teacher).where(Teacher.email == body.email)
)
teacher = result.scalar_one_or_none()
# scalar_one_or_none() returns the Teacher object, or None if not found

# Insert example from auth.py
teacher = Teacher(email=body.email, hashed_password=hash_password(body.password), name=body.name)
db.add(teacher)        # stage the insert
await db.commit()      # actually write to the database
await db.refresh(teacher)  # reload the object (gets the DB-generated id, created_at, etc.)
```

---

## 4. redis_client.py — Redis Singleton

**File:** [backend/redis_client.py](backend/redis_client.py)

```python
import redis.asyncio as aioredis
from backend.config import settings

_redis: aioredis.Redis | None = None   # None means not yet created

async def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(settings.redis_url, decode_responses=True)
    return _redis

async def close_redis() -> None:
    global _redis
    if _redis is not None:
        await _redis.aclose()
        _redis = None
```

### What is Redis?

Redis is an in-memory key-value store — think of it like a very fast dictionary that
lives outside your Python process and persists between requests.

Your project uses Redis for two things:
1. **Rolling signal buffer** — last 20 attention scores per student (1 minute of data)
2. **Active session tracking** — which sessions are currently live

### Why singleton?

`get_redis()` only creates the connection once (when `_redis is None`). Every subsequent
call returns the same connection. This is the singleton pattern — one shared instance
instead of reconnecting on every request.

`decode_responses=True` means Redis returns strings instead of bytes — no need to call
`.decode()` on every value.

---

## 5. models/ — SQLAlchemy ORM Models

ORM stands for Object-Relational Mapping. It lets you work with database rows as Python
objects instead of writing raw SQL.

---

### 5.1 Teacher Model

**File:** [backend/models/teacher.py](backend/models/teacher.py)

```python
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.database import Base

class Teacher(Base):
    __tablename__ = "teachers"    # the actual PostgreSQL table name

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    classrooms: Mapped[list["Classroom"]] = relationship(
        "Classroom", back_populates="teacher", cascade="all, delete-orphan"
    )
```

### Breaking down every piece

**`class Teacher(Base)`**
Inherits from `Base` (defined in database.py). SQLAlchemy registers this class and maps
it to the `teachers` table.

**`__tablename__ = "teachers"`**
The PostgreSQL table name. Without this, SQLAlchemy would not know which table to use.

**`Mapped[uuid.UUID]`**
This is a type annotation that tells SQLAlchemy (and pyright) what Python type this
column holds. `Mapped[X]` is the modern SQLAlchemy 2.0 way to annotate columns.

**`mapped_column(...)`**
Defines the actual database column. Arguments:

| Argument | Meaning |
|---|---|
| `UUID(as_uuid=True)` | PostgreSQL UUID type; `as_uuid=True` returns Python `uuid.UUID` objects |
| `primary_key=True` | This is the primary key column |
| `default=uuid.uuid4` | If no id given, call `uuid.uuid4()` to generate one |
| `String(255)` | VARCHAR(255) in PostgreSQL |
| `unique=True` | Add a UNIQUE constraint |
| `index=True` | Add a database index (makes lookups by email fast) |
| `nullable=False` | NOT NULL constraint — this column must have a value |
| `DateTime(timezone=True)` | TIMESTAMPTZ — stores timezone-aware datetimes |

**`default=lambda: datetime.now(timezone.utc)`**
Why `lambda`? Because `default=datetime.now(timezone.utc)` would evaluate ONCE when the
class is defined and every row would get the same timestamp. Using `lambda:` means
"call this function each time a new row is created", giving a fresh timestamp each time.

**`relationship("Classroom", back_populates="teacher", cascade="all, delete-orphan")`**
This is NOT a database column. It tells SQLAlchemy how models are related.

- `"Classroom"` — the related model (string because Classroom is defined in another file)
- `back_populates="teacher"` — Classroom also has a `teacher` attribute that points back
- `cascade="all, delete-orphan"` — when a Teacher is deleted, also delete their Classrooms

---

### 5.2 Classroom Model

**File:** [backend/models/classroom.py](backend/models/classroom.py)

```python
class Classroom(Base):
    __tablename__ = "classrooms"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    teacher_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("teachers.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    yaw_threshold: Mapped[int] = mapped_column(Integer, default=30)
    pitch_threshold: Mapped[int] = mapped_column(Integer, default=25)
    alert_threshold: Mapped[int] = mapped_column(Integer, default=40)
    warn_threshold: Mapped[int] = mapped_column(Integer, default=60)

    teacher: Mapped["Teacher"] = relationship("Teacher", back_populates="classrooms")
    students: Mapped[list["Student"]] = relationship(
        "Student", back_populates="classroom", cascade="all, delete-orphan"
    )
    sessions: Mapped[list["ClassSession"]] = relationship(
        "ClassSession", back_populates="classroom", cascade="all, delete-orphan"
    )
```

**`ForeignKey("teachers.id")`**
This column references the `id` column in the `teachers` table. If you try to insert
a classroom with a `teacher_id` that doesn't exist in `teachers`, PostgreSQL will reject it.

---

### 5.3 Student Model

**File:** [backend/models/student.py](backend/models/student.py)

```python
class Student(Base):
    __tablename__ = "students"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    classroom_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("classrooms.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    session_token: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    classroom: Mapped["Classroom"] = relationship("Classroom", back_populates="students")
    signals: Mapped[list["AttentionSignal"]] = relationship(
        "AttentionSignal", back_populates="student", cascade="all, delete-orphan"
    )
```

The `session_token` is a random URL-safe string (generated in the router using
`secrets.token_urlsafe(48)`). This is shared with the student as their URL:
`/student/[token]`. It authenticates signals without needing a password.

---

### 5.4 ClassSession Model

**File:** [backend/models/session.py](backend/models/session.py)

```python
class ClassSession(Base):
    __tablename__ = "class_sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    classroom_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("classrooms.id"), nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    #          ^^^^^^^^^^^^^^^^
    #          Optional means this can be None (session still active)
```

`ended_at` being `None` means the session is currently live. Checking
`ClassSession.ended_at.is_(None)` in a query filters for active sessions.

---

### 5.5 AttentionSignal Model

**File:** [backend/models/signal.py](backend/models/signal.py)

```python
class AttentionSignal(Base):
    __tablename__ = "attention_signals"
    __table_args__ = (
        Index("ix_signals_session_student_ts", "session_id", "student_id", "timestamp"),
    )
    #  ^^^ composite index on 3 columns — makes analytics queries fast

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    #                                ^^^^^^^^^^                    ^^^^^^^^^^^^^^^
    #                            int64 (large number)         auto-increment PK
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("class_sessions.id"), nullable=False)
    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False)
    attention_score: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    flags: Mapped[Optional[list[str]]] = mapped_column(ARRAY(String), nullable=True)
    #                                                   ^^^^^^^^^^^^
    #                             PostgreSQL-specific: stores a list of strings as an array column
    yaw: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    pitch: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
```

`__table_args__` lets you add table-level constraints and indexes that don't belong to a
single column. The composite index `(session_id, student_id, timestamp)` covers the most
common query pattern: "give me all signals for this student in this session, sorted by time".

---

## 6. schemas/ — Pydantic Validation Schemas

Schemas are different from models. Models map to database tables. Schemas define what
JSON goes IN (request bodies) and what JSON comes OUT (responses).

---

### 6.1 Auth Schemas

**File:** [backend/schemas/auth.py](backend/schemas/auth.py)

```python
from pydantic import BaseModel, EmailStr

class LoginRequest(BaseModel):
    email: EmailStr    # EmailStr validates that the string looks like an email
    password: str

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"   # default value — field is optional in the JSON
    teacher_id: str
    name: str
```

When the frontend sends this JSON:
```json
{"email": "notanemail", "password": "123"}
```

FastAPI automatically rejects it with HTTP 422 before your function runs:
```json
{"detail": [{"loc": ["body", "email"], "msg": "value is not a valid email address"}]}
```

---

### 6.2 Classroom Schemas

**File:** [backend/schemas/classroom.py](backend/schemas/classroom.py)

```python
class ClassroomCreate(BaseModel):
    """Used for POST /api/classrooms — creating a new classroom."""
    name: str
    yaw_threshold: int = 30    # optional, has default
    pitch_threshold: int = 25
    alert_threshold: int = 40
    warn_threshold: int = 60

class ClassroomUpdate(BaseModel):
    """Used for PATCH /api/classrooms/{id} — partial update."""
    name: Optional[str] = None            # None means "don't change this field"
    yaw_threshold: Optional[int] = None
    pitch_threshold: Optional[int] = None
    alert_threshold: Optional[int] = None
    warn_threshold: Optional[int] = None

class ClassroomOut(BaseModel):
    """Returned by the API — what the frontend sees."""
    id: uuid.UUID
    teacher_id: uuid.UUID
    name: str
    yaw_threshold: int
    pitch_threshold: int
    alert_threshold: int
    warn_threshold: int
    created_at: datetime

    model_config = {"from_attributes": True}
    #               ^^^^^^^^^^^^^^^^^^^^^^^^
    # This tells Pydantic it can read from SQLAlchemy ORM objects
    # (not just plain dicts). Without this, returning a Classroom ORM
    # object from a route would fail.
```

**The three schema pattern:**

| Schema | Used for | Contains |
|---|---|---|
| `ClassroomCreate` | Request body of POST | Fields required to create |
| `ClassroomUpdate` | Request body of PATCH | All fields optional (partial update) |
| `ClassroomOut` | Response body | All fields the client should see |

---

### 6.3 Student Schemas

**File:** [backend/schemas/student.py](backend/schemas/student.py)

```python
class StudentJoinRequest(BaseModel):
    name: str
    roll_number: str

    @field_validator("name", "roll_number")  # apply this validator to both fields
    @classmethod
    def not_empty(cls, v: str) -> str:
        if not v.strip():                    # strip() removes whitespace
            raise ValueError("Field cannot be blank")
        return v.strip()                     # return cleaned value
```

`@field_validator` adds custom validation logic. The `@classmethod` decorator is required
by Pydantic v2 — it means the method receives the class `cls` instead of an instance `self`.

If a student sends `{"name": "  ", "roll_number": "01"}`, the validator raises `ValueError`
and Pydantic converts it to a 422 HTTP response automatically.

---

### 6.4 Signal Schemas

**File:** [backend/schemas/signal.py](backend/schemas/signal.py)

```python
class SignalIn(BaseModel):
    """What the student sends to POST /api/signals."""
    session_id: uuid.UUID
    student_id: uuid.UUID
    token: str
    attention_score: int
    flags: list[str] = []      # default empty list
    yaw: Optional[float] = None
    pitch: Optional[float] = None
    timestamp: Optional[datetime] = None   # if not provided, backend uses now()

class SignalOut(BaseModel):
    """What the API returns when querying signals."""
    id: int
    session_id: uuid.UUID
    student_id: uuid.UUID
    attention_score: int
    flags: Optional[list[str]]
    yaw: Optional[float]
    pitch: Optional[float]
    timestamp: datetime

    model_config = {"from_attributes": True}
```

---

## 7. services/ — Business Logic Layer

Services contain the actual logic — calculations, JWT operations, report generation.
They don't know about HTTP. Routes call services; services don't call routes.

---

### 7.1 auth_service.py

**File:** [backend/services/auth_service.py](backend/services/auth_service.py)

```python
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
```

**`CryptContext`** — a password hashing context. `schemes=["bcrypt"]` means use bcrypt
algorithm (industry standard, slow by design to resist brute-force attacks).

**`OAuth2PasswordBearer`** — a FastAPI utility that reads the `Authorization: Bearer <token>`
header from incoming requests. `tokenUrl` points to the login endpoint (used by Swagger UI).

```python
def hash_password(password: str) -> str:
    return pwd_context.hash(password)    # "hello123" → "$2b$12$xyz..."

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)  # compares safely (constant time)
```

**Why not just compare `plain == hashed`?**
Bcrypt is a one-way hash — you can't reverse it. `verify` re-hashes the plain password
with the same salt and compares. It also takes the same time regardless of where the
strings differ (constant-time comparison prevents timing attacks).

```python
def create_access_token(teacher_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    return jwt.encode(
        {"sub": teacher_id, "exp": expire},  # payload
        settings.secret_key,                  # signing key
        algorithm=settings.jwt_algorithm      # "HS256"
    )
```

A JWT (JSON Web Token) is a signed string: `header.payload.signature`
- `"sub"` (subject) — standard JWT claim, stores the teacher's ID
- `"exp"` (expiry) — standard JWT claim, token is invalid after this time
- The secret key is used to sign the token; without the key you can't forge a valid token

```python
async def get_current_teacher(token: str, db: AsyncSession) -> Teacher:
    exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])
        teacher_id: Optional[str] = payload.get("sub")
        if not teacher_id:
            raise exc
    except JWTError:
        raise exc

    result = await db.execute(select(Teacher).where(Teacher.id == uuid.UUID(teacher_id)))
    teacher = result.scalar_one_or_none()
    if not teacher:
        raise exc
    return teacher
```

Every possible failure (bad token format, expired, wrong signature, teacher not in DB)
raises the same `exc`. This prevents leaking information about WHY it failed.

---

### 7.2 attention_service.py

**File:** [backend/services/attention_service.py](backend/services/attention_service.py)

```python
def compute_ema(scores: list[int], alpha: float = settings.ema_alpha) -> float:
    """Exponential Moving Average — gives more weight to recent scores."""
    if not scores:
        return 100.0          # no data → assume attentive
    ema = float(scores[0])    # start with the oldest score
    for score in scores[1:]:  # scores[1:] means "all elements from index 1 onwards"
        ema = alpha * score + (1 - alpha) * ema
    return round(ema, 2)
```

`scores[1:]` is a **slice** — it creates a new list containing elements from index 1 to end.
```python
scores = [80, 70, 60, 50]
scores[1:]    # [70, 60, 50]
scores[:2]    # [80, 70]
scores[1:3]   # [70, 60]
```

```python
def should_fire_alert(current_status: str, previous_status: Optional[str]) -> Optional[str]:
    """Only alert on STATE TRANSITIONS, not on every signal."""
    if current_status == "alert" and previous_status not in ("alert",):
        return "DISTRACTED"
    if previous_status in ("alert", "at_risk") and current_status in ("attentive", "distracted"):
        return "RECOVERED"
    return None
```

`not in` checks if a value is NOT in a tuple/list:
```python
"attentive" not in ("alert",)   # True
"alert" not in ("alert",)       # False
```

`Optional[str]` return type means this function returns either a string or `None`.

---

### 7.3 redis_service.py

**File:** [backend/services/redis_service.py](backend/services/redis_service.py)

```python
BUFFER_MAX = 20
_SIGNAL_KEY = "signals:{session_id}:{student_id}"   # key template

async def push_signal_to_buffer(redis, session_id, student_id, score) -> list[int]:
    key = _SIGNAL_KEY.format(session_id=session_id, student_id=student_id)
    pipe = redis.pipeline()    # batch multiple Redis commands
    pipe.rpush(key, score)     # append score to the right of the list
    pipe.ltrim(key, -BUFFER_MAX, -1)  # keep only last 20 items
    pipe.lrange(key, 0, -1)   # read the entire list
    results = await pipe.execute()  # send all 3 commands at once
    return [int(v) for v in results[2]]  # results[2] is the lrange result
```

**Redis commands used:**

| Command | Meaning |
|---|---|
| `rpush key value` | Append value to the right end of a Redis list |
| `ltrim key start stop` | Keep only elements from start to stop (trims the list) |
| `lrange key 0 -1` | Read all elements (-1 means last) |
| `pipeline()` | Batch multiple commands — sent as one network round trip |

```python
async def set_student_state(redis, session_id, student_id, state: dict) -> None:
    key = _STATE_KEY.format(session_id=session_id, student_id=student_id)
    await redis.set(key, json.dumps(state), ex=7200)
    #                    ^^^^^^^^^^^^^^^^    ^^^^^^^^
    #                serialize dict to JSON  expire in 7200 seconds (2 hours)
```

`json.dumps(state)` converts a Python dict to a JSON string for storage.
`json.loads(raw)` converts it back when reading.

---

## 8. routers/ — HTTP Route Handlers

Routers group related endpoints. Each router is an `APIRouter` that gets registered
in `main.py`. The prefix is prepended to every route in that router.

---

### 8.1 auth.py Router

**File:** [backend/routers/auth.py](backend/routers/auth.py)

```python
from fastapi import APIRouter, Depends, HTTPException, status

router = APIRouter(prefix="/api/auth", tags=["auth"])
#                  ^^^^^^^^^^^^^^^^^   ^^^^^^^^^^^^
#                  all routes start     groups routes in Swagger UI
#                  with /api/auth

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    # 1. Check if email already exists
    existing = await db.execute(select(Teacher).where(Teacher.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    # 2. Create and save the teacher
    teacher = Teacher(
        email=body.email,
        hashed_password=hash_password(body.password),
        name=body.name
    )
    db.add(teacher)
    await db.commit()
    await db.refresh(teacher)

    # 3. Return a JWT token
    return TokenResponse(
        access_token=create_access_token(str(teacher.id)),
        teacher_id=str(teacher.id),
        name=teacher.name,
    )
```

**Parameter types FastAPI understands:**

| Parameter | How FastAPI treats it |
|---|---|
| `body: RegisterRequest` | Read and validate from JSON request body |
| `db: AsyncSession = Depends(get_db)` | Call `get_db()` and inject the result |
| `classroom_id: uuid.UUID` | Read from the URL path `/classrooms/{classroom_id}` |
| `limit: int = Query(100, le=1000)` | Read from query string `?limit=50`, max 1000 |

**HTTP status codes:**

| Code | Meaning | When to use |
|---|---|---|
| 200 | OK | Default for GET, success |
| 201 Created | Resource created | POST that creates something |
| 204 No Content | Success, nothing to return | DELETE |
| 400 Bad Request | Client sent bad data | Duplicate email, invalid state |
| 401 Unauthorized | Not authenticated | Missing/invalid JWT |
| 403 Forbidden | Authenticated but not allowed | Teacher accessing another teacher's data |
| 404 Not Found | Resource doesn't exist | Wrong ID |
| 422 Unprocessable Entity | Validation failed | Automatic from Pydantic |

---

### 8.2 classrooms.py Router

**File:** [backend/routers/classrooms.py](backend/routers/classrooms.py)

```python
router = APIRouter(prefix="/api/classrooms", tags=["classrooms"])

# ── Auth dependency ─────────────────────────────────────────────────────────
async def _teacher(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> Teacher:
    """Resolve the authenticated teacher from the JWT."""
    return await get_current_teacher(token, db)
```

This `_teacher` function is itself a dependency. Any route that does
`teacher: Teacher = Depends(_teacher)` will:
1. Extract the Bearer token from the Authorization header (via `oauth2_scheme`)
2. Open a DB session (via `get_db`)
3. Decode the JWT and load the Teacher from the database
4. Return the Teacher object to the route

If any step fails, a 401 is returned before the route runs.

```python
@router.get("", response_model=list[ClassroomOut])
async def list_classrooms(
    teacher: Teacher = Depends(_teacher),
    db: AsyncSession = Depends(get_db)
) -> list[Classroom]:
    result = await db.execute(
        select(Classroom).where(Classroom.teacher_id == teacher.id)
    )
    return list(result.scalars().all())
```

`result.scalars().all()` — when you execute a SELECT query:
- `result` is a raw result object
- `.scalars()` extracts the first column (the ORM object)
- `.all()` returns a Python list of all rows

```python
@router.patch("/{classroom_id}", response_model=ClassroomOut)
async def update_classroom(classroom_id: uuid.UUID, body: ClassroomUpdate, ...) -> Classroom:
    classroom = await _owned(classroom_id, teacher.id, db)
    for field, value in body.model_dump(exclude_none=True).items():
        #                  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        # model_dump() converts Pydantic model to dict
        # exclude_none=True skips fields that are None (not provided in request)
        setattr(classroom, field, value)   # set attribute by name dynamically
    await db.commit()
    await db.refresh(classroom)
    return classroom
```

`body.model_dump(exclude_none=True)` for a PATCH request with `{"name": "New Name"}`:
```python
# Returns only the fields that were actually provided:
{"name": "New Name"}
# NOT: {"name": "New Name", "yaw_threshold": None, "pitch_threshold": None, ...}
```

`setattr(obj, "name", "New Name")` is equivalent to `obj.name = "New Name"` but works
when the field name is in a variable.

```python
@router.delete("/{classroom_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_classroom(classroom_id: uuid.UUID, teacher: Teacher = Depends(_teacher), db: ...) -> None:
    classroom = await _owned(classroom_id, teacher.id, db)
    await db.delete(classroom)   # marks for deletion
    await db.commit()            # executes the DELETE in PostgreSQL
```

---

### 8.3 students.py Router

**File:** [backend/routers/students.py](backend/routers/students.py)

```python
import secrets

@router.post("/api/classrooms/{classroom_id}/students", response_model=StudentOut, status_code=201)
async def add_student(classroom_id: uuid.UUID, body: StudentCreate, ...) -> Student:
    await _owned_classroom(classroom_id, teacher.id, db)   # verify ownership
    student = Student(
        classroom_id=classroom_id,
        name=body.name,
        session_token=secrets.token_urlsafe(48),  # generate secure random token
        #             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        # 48 bytes of randomness encoded as URL-safe base64
        # Result: "ABC123xyz..." (64 character string)
    )
    db.add(student)
    await db.commit()
    await db.refresh(student)
    return student
```

`secrets.token_urlsafe(48)` generates a cryptographically secure random token.
This is the token shared with students as their monitoring URL: `/student/{token}`.

---

### 8.4 sessions.py Router

**File:** [backend/routers/sessions.py](backend/routers/sessions.py)

```python
@router.get("/{session_id}/export/csv")
async def export_csv(session_id: uuid.UUID, ...) -> StreamingResponse:
    content = await _build_csv(session_id, db)
    return StreamingResponse(
        iter([content]),           # wrap string in an iterator
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=session_{session_id}.csv"},
    )
```

`StreamingResponse` sends data as a stream instead of loading it all into memory first.
`Content-Disposition: attachment` tells the browser to download the file instead of
displaying it.

```python
async def _build_csv(session_id: uuid.UUID, db: AsyncSession) -> str:
    result = await db.execute(
        select(AttentionSignal, Student.name)    # select from two tables
        .join(Student, AttentionSignal.student_id == Student.id)  # JOIN condition
        .where(AttentionSignal.session_id == session_id)
        .order_by(AttentionSignal.timestamp)
    )
    rows = result.all()    # each row is (AttentionSignal, student_name)
    lines = ["student_name,attention_score,flags,yaw,pitch,timestamp"]
    for sig, name in rows:
        flags_str = "|".join(sig.flags or [])
        # sig.flags or [] — if flags is None, use empty list
        # "|".join([...]) — join list items with "|" separator
        lines.append(f"{name},{sig.attention_score},{flags_str},{sig.yaw},{sig.pitch},{sig.timestamp.isoformat()}")
    return "\n".join(lines)
```

---

### 8.5 signals.py Router

**File:** [backend/routers/signals.py](backend/routers/signals.py)

```python
@router.get("/sessions/{session_id}", response_model=list[SignalOut])
async def get_session_signals(
    session_id: uuid.UUID,
    limit: int = Query(100, le=1000),    # query param: ?limit=50 (max 1000)
    offset: int = Query(0, ge=0),        # query param: ?offset=100 (min 0)
    teacher: Teacher = Depends(_teacher),
    db: AsyncSession = Depends(get_db),
) -> list[AttentionSignal]:
    result = await db.execute(
        select(AttentionSignal)
        .where(AttentionSignal.session_id == session_id)
        .order_by(AttentionSignal.timestamp.desc())   # newest first
        .offset(offset)
        .limit(limit)
    )
    return list(result.scalars().all())
```

`Query(100, le=1000)` — a query parameter with:
- Default value: `100`
- `le=1000` means `≤ 1000` (FastAPI validates this automatically)
- Other validators: `ge` (≥), `gt` (>), `lt` (<), `min_length`, `max_length`

---

## 9. socketio_handlers/ — Real-time Event Handlers

Socket.io handlers are like HTTP routes, but for WebSocket events. Instead of
`@router.post(...)` you use `@sio.event`.

---

### 9.1 student_events.py

**File:** [backend/socketio_handlers/student_events.py](backend/socketio_handlers/student_events.py)

```python
from backend.socket_server import sio

@sio.event
async def join_session(sid: str, data: dict) -> None:
    """Called when a student emits 'join_session' from the browser."""
    token = data.get("token")
    if not token:
        await sio.emit("error", {"message": "Token required"}, to=sid)
        return     # early return — stop processing

    async with AsyncSessionLocal() as db:   # no Depends() here — must manage manually
        student = ...
        session = ...

    await sio.enter_room(sid, f"session:{session.id}")
    #     ^^^^^^^^^^^^^^
    # Rooms are like chat groups — emit to a room and everyone in it receives

    await sio.save_session(sid, {
        "student_id": str(student.id),
        "session_id": str(session.id),
        # ...
    })
    # save_session stores data associated with this socket connection (sid)
    # retrieve it later with sio.get_session(sid)

    await sio.emit("joined", {"session_id": str(session.id)}, to=sid)
    #                                                           ^^^^^^
    # to=sid — send only to THIS specific connection
```

**`sid`** — the Socket ID. Every WebSocket connection gets a unique ID. Use it to send
messages to a specific client.

**Rooms** — a group of socket connections. Emitting to a room sends to all members.
Your project uses `session:{session_id}` as the room name. Both the teacher and all
students in a session are in the same room.

```python
@sio.event
async def signal(sid: str, data: dict) -> None:
    session_data = await sio.get_session(sid)   # load data saved during join_session
    if not session_data:
        return

    # Read signal data from the event payload
    raw_score = int(data.get("attention_score", 100))
    flags: list[str] = data.get("flags", [])
    yaw: float | None = data.get("yaw")
    pitch: float | None = data.get("pitch")

    # Update Redis buffer and compute smoothed score
    redis = await get_redis()
    scores = await push_signal_to_buffer(redis, session_id_str, student_id_str, raw_score)
    ema_score = compute_ema(scores)

    # Persist to PostgreSQL
    async with AsyncSessionLocal() as db:
        db.add(AttentionSignal(...))
        await db.commit()

    # Broadcast to the teacher dashboard
    await sio.emit("STATUS_UPDATE", build_status_update_payload(...), room=room)

    # Only fire ALERT on threshold crossing, not every signal
    alert_type = should_fire_alert(current_status, previous_status)
    if alert_type:
        await sio.emit("ALERT", build_alert_payload(...), room=room)
```

Notice that Socket.io handlers don't use `Depends()` — they must manually call
`AsyncSessionLocal()` and `get_redis()` because they're not inside a FastAPI request.

---

## 10. main.py — App Factory and Lifespan

**File:** [backend/main.py](backend/main.py)

```python
import asyncio
from contextlib import asynccontextmanager
import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Side-effect imports — just importing these files runs @sio.event decorators
import backend.socketio_handlers.student_events  # noqa: F401
import backend.socketio_handlers.teacher_events  # noqa: F401
```

**`# noqa: F401`** — tells the linter "I know this looks like an unused import, but
don't warn me. It runs code when imported (registers the @sio.event handlers)."

---

### 10.1 Background Task

```python
async def _snapshot_broadcaster() -> None:
    """Runs forever in the background — sends SESSION_SNAPSHOT every 5 seconds."""
    while True:
        await asyncio.sleep(5)    # wait 5 seconds (non-blocking)
        try:
            redis = await get_redis()
            active_ids = await get_active_session_ids(redis)
            if not active_ids:
                continue    # skip this loop iteration, go back to sleep

            async with AsyncSessionLocal() as db:
                for session_id_str in active_ids:
                    ...
                    await sio.emit("SESSION_SNAPSHOT", snapshot, room=f"session:{session_id_str}")
        except Exception:
            pass    # never crash the loop — log and continue
```

`while True:` with `await asyncio.sleep(5)` is the standard Python pattern for a
background task that runs repeatedly. It doesn't block other requests because `await`
releases control while sleeping.

---

### 10.2 Lifespan

```python
@asynccontextmanager
async def lifespan(_app: FastAPI):
    # ── STARTUP ──────────────────────────────────
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)  # create all tables
    await get_redis()                                   # warm the connection
    task = asyncio.create_task(_snapshot_broadcaster()) # start background loop
    yield                                               # app is running now
    # ── SHUTDOWN ─────────────────────────────────
    task.cancel()       # stop the background task
    await close_redis() # close the Redis connection
```

`@asynccontextmanager` turns an async generator function into a context manager.
`asyncio.create_task(...)` starts a coroutine running concurrently in the background.

---

### 10.3 App Assembly

```python
_fastapi_app = FastAPI(title="Student Attention Monitor API", version="1.0.0", lifespan=lifespan)

# Add CORS middleware
_fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.socketio_cors_origins.split(","),
    # "http://localhost:3000".split(",") → ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],    # allow all HTTP methods
    allow_headers=["*"],    # allow all headers
)

# Register all routers
_fastapi_app.include_router(auth.router)
_fastapi_app.include_router(classrooms.router)
_fastapi_app.include_router(students.router)
_fastapi_app.include_router(sessions.router)
_fastapi_app.include_router(signals.router)

# Wrap FastAPI with Socket.io so both share one port
app = socketio.ASGIApp(sio, _fastapi_app)
```

**CORS (Cross-Origin Resource Sharing)**

Browsers block JavaScript from calling APIs on a different origin (host/port).
Your frontend is on `localhost:3000`, the API is on `localhost:8000` — different ports,
different origins. CORSMiddleware adds HTTP headers that tell the browser this is allowed.

**`ASGIApp`**

ASGI (Asynchronous Server Gateway Interface) is the Python standard for async web apps.
`socketio.ASGIApp(sio, _fastapi_app)` wraps both Socket.io and FastAPI under one server:
- HTTP requests → handled by FastAPI
- WebSocket connections → handled by Socket.io

---

## 11. How a Request Flows End to End

### Example: Teacher logs in

```
POST /api/auth/login
Content-Type: application/json
{"email": "teacher@demo.com", "password": "demo1234"}

Step 1 ─ Uvicorn receives the HTTP request
Step 2 ─ ASGI app routes it to FastAPI (not Socket.io, it's HTTP)
Step 3 ─ FastAPI matches /api/auth/login → auth.router → login()
Step 4 ─ FastAPI reads body JSON → validates with LoginRequest schema
          If invalid (bad email format) → returns 422, login() never runs
Step 5 ─ FastAPI calls get_db() → opens AsyncSession, injects as `db`
Step 6 ─ login() runs:
          await db.execute(select(Teacher).where(Teacher.email == body.email))
          → sends SQL to PostgreSQL, awaits response
Step 7 ─ verify_password("demo1234", teacher.hashed_password) → True
Step 8 ─ create_access_token(teacher.id) → builds JWT string
Step 9 ─ return TokenResponse(...) → FastAPI serializes to JSON
Step 10 ─ get_db() cleanup runs → session closed
Step 11 ─ HTTP 200 response sent to client:
           {"access_token": "eyJ...", "token_type": "bearer", "teacher_id": "uuid", "name": "Demo"}
```

### Example: Student sends an attention signal

```
WebSocket message to backend:
Event: "signal"
Data: {"attention_score": 72, "flags": ["gaze_away"], "yaw": 15.2, "pitch": -5.1}

Step 1 ─ Socket.io receives the "signal" event
Step 2 ─ @sio.event routes it to signal() in student_events.py
Step 3 ─ sio.get_session(sid) → loads {student_id, session_id, ...} for this connection
Step 4 ─ push_signal_to_buffer(redis, ..., 72) → appends 72 to Redis list, trims to 20
Step 5 ─ compute_ema([...20 scores...]) → 74.3
Step 6 ─ Open DB session → load classroom thresholds → save AttentionSignal row → commit
Step 7 ─ score_to_status(74.3, 40, 60) → "distracted"
Step 8 ─ get_student_state() → previous status was "attentive"
Step 9 ─ sio.emit("STATUS_UPDATE", {...}, room="session:uuid") → sent to teacher dashboard
Step 10 ─ should_fire_alert("distracted", "attentive") → None (no threshold crossed)
          No ALERT emitted
```

---

## 12. Quick Reference Cheat Sheet

### FastAPI Decorators

```python
@router.get("/path")       # GET request
@router.post("/path")      # POST request
@router.patch("/path")     # PATCH (partial update)
@router.delete("/path")    # DELETE request
@sio.event                 # Socket.io event handler
```

### FastAPI Parameter Types

```python
# Path parameter — from URL
async def get_classroom(classroom_id: uuid.UUID): ...

# Request body — from JSON body
async def create(body: ClassroomCreate): ...

# Dependency injection
async def route(db: AsyncSession = Depends(get_db)): ...
async def route(teacher: Teacher = Depends(_teacher)): ...

# Query parameter — from ?key=value
async def list(limit: int = Query(100, le=1000)): ...
```

### SQLAlchemy Query Patterns

```python
# SELECT WHERE
result = await db.execute(select(Teacher).where(Teacher.email == email))
teacher = result.scalar_one_or_none()    # one object or None
teachers = result.scalars().all()        # list of objects

# INSERT
db.add(new_object)
await db.commit()
await db.refresh(new_object)   # reload from DB to get generated fields

# UPDATE
obj.field = new_value
await db.commit()

# DELETE
await db.delete(obj)
await db.commit()

# ORDER, LIMIT, OFFSET
select(Model).order_by(Model.created_at.desc()).limit(100).offset(0)

# JOIN
select(Signal, Student.name).join(Student, Signal.student_id == Student.id)
```

### Pydantic Patterns

```python
# Convert ORM object to dict
body.model_dump()                    # all fields
body.model_dump(exclude_none=True)   # skip None fields

# Enable reading from ORM objects
model_config = {"from_attributes": True}

# Custom validator
@field_validator("name")
@classmethod
def not_empty(cls, v: str) -> str:
    if not v.strip():
        raise ValueError("cannot be blank")
    return v.strip()
```

### Redis Patterns

```python
# String get/set with TTL
await redis.set("key", json.dumps(data), ex=7200)   # expires in 2 hours
raw = await redis.get("key")
data = json.loads(raw) if raw else None

# List operations
await redis.rpush("key", value)          # append to right
await redis.ltrim("key", -20, -1)        # keep last 20 items
items = await redis.lrange("key", 0, -1) # read all

# Set operations
await redis.sadd("active_sessions", session_id)    # add to set
await redis.srem("active_sessions", session_id)    # remove from set
members = await redis.smembers("active_sessions")  # get all members

# Pipeline (batch multiple commands)
pipe = redis.pipeline()
pipe.rpush("key", val)
pipe.ltrim("key", -20, -1)
pipe.lrange("key", 0, -1)
results = await pipe.execute()   # results[0], results[1], results[2]
```

### Error Handling

```python
# Return an HTTP error and stop execution
raise HTTPException(status_code=404, detail="Not found")
raise HTTPException(status_code=401, detail="Unauthorized", headers={"WWW-Authenticate": "Bearer"})
raise HTTPException(status_code=400, detail="Email already registered")

# Emit a Socket.io error and return early
await sio.emit("error", {"message": "Token required"}, to=sid)
return
```

### Type Annotations Cheat Sheet

```python
str          # text
int          # integer
float        # decimal number
bool         # True / False
uuid.UUID    # UUID object
datetime     # date + time object

list[str]           # list of strings
list[int]           # list of ints
dict[str, float]    # dict with string keys and float values

Optional[str]       # str or None
str | None          # same thing (Python 3.10+ syntax)

# Function return types
-> str          # returns a string
-> None         # returns nothing
-> list[Model]  # returns a list of Model objects
-> AsyncGenerator[AsyncSession, None]  # async generator
```

---

*Generated from the Student Attention Monitor codebase. Every example is real code from this project.*
