# Contributing to Student Attention Monitor

Thanks for your interest in contributing. This document covers how to set up the project for development, the conventions used across the codebase, and what the review process looks like.

---

## Getting Started

Follow the setup steps in [README.md](README.md) to get a working local environment. Everything runs locally — no cloud accounts required.

Once running, the demo teacher account (`teacher@demo.com` / `demo1234`) is available after seeding the database.

---

## Project Layout

| Directory            | What lives there                                    |
|----------------------|-----------------------------------------------------|
| `backend/`           | FastAPI application — routers, services, models     |
| `frontend/`          | Next.js 15 App Router — pages, components, hooks    |
| `cv_engine/`         | Python CV process — MediaPipe face + head pose      |
| `scripts/`           | Dev utilities — seeder, load tester, preflight check|
| `models/`            | ML model binaries (not committed — see models/README)|

---

## Development Conventions

### Python (backend + cv_engine)

- **Type hints on every function.** No bare `def foo(x):`.
- **Async by default.** All database calls use `async/await` with SQLAlchemy's async session. No sync DB calls.
- **Services, not fat routes.** Route handlers call service functions. Business logic lives in `services/`.
- **Pydantic validation.** All request bodies go through a Pydantic schema. Never trust raw dicts from the client.
- **No hardcoded secrets.** All config comes from `backend/config.py` which reads from `.env`.
- **Error handling.** FastAPI routes raise `HTTPException`. CV engine wraps frame processing in try/except.

### TypeScript (frontend)

- **Strict TypeScript.** `tsconfig.json` has `strict: true`. Do not use `any` except at genuine boundaries.
- **No logic in page files.** Pages import and compose components; logic lives in hooks or `lib/`.
- **shadcn/ui for primitives.** Don't write raw buttons, inputs, or dialogs from scratch.
- **Socket.io event names match the spec.** The canonical event format is defined in [CLAUDE.md](CLAUDE.md). Don't invent new event names.

### General

- **No commented-out code in PRs.** Delete it or leave a TODO with a GitHub issue number.
- **One file at a time.** Complete each changed file fully — no partial stubs.
- **Run the linter/formatter before opening a PR** (see below).

---

## Running Tests and Linters

```bash
# Backend — from the repo root
backend/venv/Scripts/python -m pytest backend/tests/

# Frontend — from frontend/
npm run lint
npm run type-check
```

There are no tests yet (MVP phase). When you add a feature, add a test for the service layer.

---

## Database Migrations

If your change modifies a SQLAlchemy model, generate an Alembic migration:

```bash
backend/venv/Scripts/python -m alembic \
  -c backend/migrations/alembic.ini \
  revision --autogenerate -m "describe_your_change"
```

Review the generated file in `backend/migrations/versions/` before committing — autogenerate sometimes misses things.

---

## Submitting a Pull Request

1. **Fork** the repo and create a branch off `main`: `git checkout -b feat/your-feature`.
2. **Keep commits focused** — one logical change per commit.
3. **Fill out the PR template** — what changed, why, how to test it.
4. **Link the related issue** if one exists.
5. **Do not commit `.env` files, model binaries, or `node_modules/`.**

PRs are reviewed by the maintainer. Expect feedback within a few days. Small, focused PRs merge faster.

---

## Reporting Bugs

Open a [GitHub issue](../../issues) using the Bug Report template. Include:

- Steps to reproduce (exact commands or browser actions)
- What you expected vs what actually happened
- Logs from the backend terminal or browser console
- Your OS, Python version, Node version, Docker version

---

## Feature Requests

Open a [GitHub issue](../../issues) using the Feature Request template. Describe the problem you're solving, not just the solution you have in mind.

Features outside the [MVP scope](CLAUDE.md#mvp-scope-boundaries-whats-in-vs-out) will be tracked but deferred.

---

## License

By contributing, you agree your changes will be released under the [MIT License](LICENSE).
