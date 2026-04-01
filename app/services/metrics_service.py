from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.agent_run import AgentRun
from app.models.approval_task import ApprovalTask
from app.models.ticket import Ticket
from app.models.tool_call import ToolCall
from app.schemas.metrics import MetricsSummary


def get_metrics_summary(db: Session) -> MetricsSummary:
    ticket_count = db.scalar(select(func.count(Ticket.id))) or 0
    resolved_ticket_count = db.scalar(select(func.count(Ticket.id)).where(Ticket.status == "resolved")) or 0
    approval_pending_count = (
        db.scalar(select(func.count(ApprovalTask.id)).where(ApprovalTask.status == "pending")) or 0
    )
    run_count = db.scalar(select(func.count(AgentRun.id))) or 0
    completed_run_count = db.scalar(select(func.count(AgentRun.id)).where(AgentRun.status == "completed")) or 0
    average_tool_latency_ms = db.scalar(select(func.avg(ToolCall.latency_ms))) or 0.0

    run_completion_rate = 0.0
    if run_count:
        run_completion_rate = completed_run_count / run_count

    return MetricsSummary(
        ticket_count=int(ticket_count),
        resolved_ticket_count=int(resolved_ticket_count),
        approval_pending_count=int(approval_pending_count),
        run_count=int(run_count),
        completed_run_count=int(completed_run_count),
        average_tool_latency_ms=round(float(average_tool_latency_ms), 2),
        run_completion_rate=round(run_completion_rate, 2),
    )
