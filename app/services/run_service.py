import logging
import time
import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.agents.triage_agent import analyze_ticket
from app.core.config import get_settings
from app.models.agent_run import AgentRun
from app.models.approval_task import ApprovalTask
from app.models.ticket import Ticket
from app.models.tool_call import ToolCall
from app.repositories.runs import get_run_record, list_approvals_for_run, list_tool_calls_for_run
from app.tools.draft_reply import draft_reply
from app.tools.kb_search import search_knowledge_base
from app.tools.order_lookup import get_order_info
from app.tools.refund_request import build_refund_request
from app.workers.queue import enqueue_run

logger = logging.getLogger(__name__)
settings = get_settings()


def create_run_for_ticket(db: Session, ticket_id: int) -> AgentRun | None:
    ticket = db.get(Ticket, ticket_id)
    if ticket is None:
        return None

    run = AgentRun(ticket_id=ticket_id, status="queued", model=settings.openai_model, trace_id=str(uuid.uuid4()))
    ticket.status = "running"
    db.add(run)
    db.commit()
    db.refresh(run)

    enqueue_run(run.id)
    return run


def get_run(db: Session, run_id: int) -> AgentRun | None:
    return get_run_record(db, run_id)


def get_run_steps(db: Session, run_id: int):
    run = get_run_record(db, run_id)
    if run is None:
        return None
    return {
        "run": run,
        "tool_calls": list_tool_calls_for_run(db, run_id),
        "approvals": list_approvals_for_run(db, run_id),
    }


def process_run(db: Session, run_id: int) -> AgentRun | None:
    run = db.get(AgentRun, run_id)
    if run is None:
        return None

    ticket = db.get(Ticket, run.ticket_id)
    if ticket is None:
        run.status = "failed"
        run.error_message = "Ticket not found"
        db.commit()
        return run

    run.status = "running"
    db.commit()

    try:
        triage = analyze_ticket(ticket)
        ticket.category = triage.category
        ticket.priority = triage.priority

        kb_start = time.perf_counter()
        kb_result = search_knowledge_base(ticket.content)
        db.add(
            ToolCall(
                run_id=run.id,
                tool_name="search_knowledge_base",
                tool_input={"query": ticket.content},
                tool_output=kb_result,
                status="completed",
                latency_ms=int((time.perf_counter() - kb_start) * 1000),
            )
        )

        order_id = triage.order_id
        if order_id:
            order_start = time.perf_counter()
            order_result = get_order_info(order_id)
            db.add(
                ToolCall(
                    run_id=run.id,
                    tool_name="get_order_info",
                    tool_input={"order_id": order_id},
                    tool_output=order_result,
                    status="completed",
                    latency_ms=int((time.perf_counter() - order_start) * 1000),
                )
            )

        if triage.recommended_action == "request_refund":
            approval = ApprovalTask(
                run_id=run.id,
                ticket_id=ticket.id,
                action_type="refund",
                action_payload=build_refund_request(order_id or "UNKNOWN", triage.summary),
                status="pending",
            )
            db.add(approval)
            ticket.status = "waiting_approval"
            run.status = "waiting_approval"
        else:
            reply_start = time.perf_counter()
            reply_result = draft_reply(triage.summary, triage.category)
            db.add(
                ToolCall(
                    run_id=run.id,
                    tool_name="draft_reply",
                    tool_input={"summary": triage.summary, "category": triage.category},
                    tool_output=reply_result,
                    status="completed",
                    latency_ms=int((time.perf_counter() - reply_start) * 1000),
                )
            )
            ticket.status = "resolved"
            run.status = "completed"
            run.finished_at = datetime.now(timezone.utc)

        run.input_tokens = len(ticket.content.split())
        run.output_tokens = len(triage.summary.split())
        db.commit()
        db.refresh(run)
        return run
    except Exception as exc:
        logger.exception("Run processing failed", extra={"run_id": run_id})
        run.status = "failed"
        run.error_message = str(exc)
        run.finished_at = datetime.now(timezone.utc)
        ticket.status = "failed"
        db.commit()
        db.refresh(run)
        return run
