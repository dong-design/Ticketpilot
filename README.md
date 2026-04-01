# TicketPilot

`TicketPilot` is a starter backend for an interview-friendly agent project. It combines a `FastAPI` API and a controlled agent workflow for ticket triage and approval-gated actions. By default it runs locally with `SQLite + inline execution`, and it can be switched to `PostgreSQL + Redis` for a fuller interview stack.

## What is included

- Ticket creation and query APIs
- Agent run creation and status tracking
- Redis-backed async queue with a local inline fallback
- Heuristic agent fallback plus optional OpenAI integration
- Tool call persistence
- Approval flow for refund-like high-risk actions
- Docker Compose for local PostgreSQL and Redis

## Quick start

1. Copy `.env.example` to `.env`
2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Start the API:

```bash
uvicorn app.main:app --reload
```

The default `.env.example` runs without PostgreSQL or Redis, so you can demo the project immediately.

## Docker mode

If you want the full `PostgreSQL + Redis` version:

```bash
docker compose up -d
```

Then update `.env`:

```env
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/ticketpilot
QUEUE_BACKEND=redis
REDIS_URL=redis://localhost:6379/0
```

Start the worker in another terminal:

```bash
python -m app.workers.run_worker
```

## Web console

Open the built-in dashboard at:

```text
http://127.0.0.1:8000/
```

It lets you create tickets, start agent runs, inspect tool calls, and approve refund actions from one screen.

## Demo accounts

Use any of these accounts in the web console:

- `analyst@ticketpilot.dev / demo123`
- `reviewer@ticketpilot.dev / demo123`
- `admin@ticketpilot.dev / demo123`

Analysts can create tickets and run workflows. Reviewers and admins can also approve or reject high-risk actions.

## Useful endpoints

- `POST /tickets`
- `GET /tickets`
- `GET /tickets/{ticket_id}`
- `GET /tickets/{ticket_id}/runs`
- `POST /tickets/{ticket_id}/run`
- `POST /auth/login`
- `GET /auth/me`
- `GET /runs/{run_id}`
- `GET /runs/{run_id}/steps`
- `GET /approvals`
- `POST /approvals/{approval_id}/approve`
- `POST /approvals/{approval_id}/reject`
- `GET /metrics/summary`

## Example flow

1. Create a ticket
2. Start a run for that ticket
3. Worker picks it up from Redis, or the app processes it inline in local mode
4. Agent computes category, priority, summary, and recommended action
5. Knowledge base lookup is stored as a tool call
6. Refund-like actions are paused for approval
7. Approval completes or rejects the run
