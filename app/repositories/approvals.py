from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.approval_task import ApprovalTask


def list_approval_records(db: Session) -> list[ApprovalTask]:
    return list(db.scalars(select(ApprovalTask).order_by(ApprovalTask.id.desc())))


def get_approval_record(db: Session, approval_id: int) -> ApprovalTask | None:
    return db.get(ApprovalTask, approval_id)
