from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.agent_run import AgentRun
from app.models.ticket import Ticket
from app.repositories.approvals import get_approval_record, list_approval_records


def list_approvals(db: Session):
    return list_approval_records(db)


def approve_task(db: Session, approval_id: int, reviewer_id: int | None, comment: str | None):
    task = get_approval_record(db, approval_id)
    if task is None:
        return None

    task.status = "approved"
    task.reviewed_by = reviewer_id
    task.review_comment = comment
    task.reviewed_at = datetime.now(timezone.utc)

    run = db.get(AgentRun, task.run_id)
    ticket = db.get(Ticket, task.ticket_id)
    if run is not None:
        run.status = "completed"
        run.finished_at = datetime.now(timezone.utc)
    if ticket is not None:
        ticket.status = "resolved"

    db.commit()
    db.refresh(task)
    return task


def reject_task(db: Session, approval_id: int, reviewer_id: int | None, comment: str | None):
    task = get_approval_record(db, approval_id)
    if task is None:
        return None

    task.status = "rejected"
    task.reviewed_by = reviewer_id
    task.review_comment = comment
    task.reviewed_at = datetime.now(timezone.utc)

    run = db.get(AgentRun, task.run_id)
    ticket = db.get(Ticket, task.ticket_id)
    if run is not None:
        run.status = "failed"
        run.finished_at = datetime.now(timezone.utc)
        run.error_message = "Approval rejected"
    if ticket is not None:
        ticket.status = "failed"

    db.commit()
    db.refresh(task)
    return task
