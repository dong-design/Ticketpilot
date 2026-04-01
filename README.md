# TicketPilot

`TicketPilot` is a starter backend for an interview-friendly agent project. It combines a `FastAPI` API, `PostgreSQL`, `Redis`, and a controlled agent workflow for ticket triage and approval-gated actions.

## What is included

- Ticket creation and query APIs
- Agent run creation and status tracking
- Redis-backed async queue
- Heuristic agent fallback plus optional OpenAI integration
- Tool call persistence
- Approval flow for refund-like high-risk actions
- Docker Compose for local PostgreSQL and Redis

## Quick start

1. Copy `.env.example` to `.env`
2. Start infrastructure:

```bash
docker compose up -d
```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Start the API:

```bash
uvicorn app.main:app --reload
```

5. Start the worker in another terminal:

```bash
python -m app.workers.run_worker
```

## Useful endpoints

- `POST /tickets`
- `GET /tickets`
- `GET /tickets/{ticket_id}`
- `POST /tickets/{ticket_id}/run`
- `GET /runs/{run_id}`
- `GET /runs/{run_id}/steps`
- `GET /approvals`
- `POST /approvals/{approval_id}/approve`
- `POST /approvals/{approval_id}/reject`

## Example flow

1. Create a ticket
2. Start a run for that ticket
3. Worker picks it up from Redis
4. Agent computes category, priority, summary, and recommended action
5. Knowledge base lookup is stored as a tool call
6. Refund-like actions are paused for approval
7. Approval completes or rejects the run
