from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.agent_run import AgentRun
from app.models.approval_task import ApprovalTask
from app.models.tool_call import ToolCall


def get_run_record(db: Session, run_id: int) -> AgentRun | None:
    return db.get(AgentRun, run_id)


def list_tool_calls_for_run(db: Session, run_id: int) -> list[ToolCall]:
    return list(db.scalars(select(ToolCall).where(ToolCall.run_id == run_id).order_by(ToolCall.id.asc())))


def list_approvals_for_run(db: Session, run_id: int) -> list[ApprovalTask]:
    return list(db.scalars(select(ApprovalTask).where(ApprovalTask.run_id == run_id).order_by(ApprovalTask.id.asc())))
