from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.schemas.approval import ApprovalAction, ApprovalTaskRead
from app.services.approval_service import approve_task, list_approvals, reject_task

router = APIRouter(prefix="/approvals", tags=["approvals"])


@router.get("", response_model=list[ApprovalTaskRead])
def list_approvals_endpoint(db: Session = Depends(get_db)) -> list[ApprovalTaskRead]:
    approvals = list_approvals(db)
    return [ApprovalTaskRead.model_validate(item) for item in approvals]


@router.post("/{approval_id}/approve", response_model=ApprovalTaskRead)
def approve_endpoint(approval_id: int, payload: ApprovalAction, db: Session = Depends(get_db)) -> ApprovalTaskRead:
    task = approve_task(db, approval_id, payload.reviewer_id, payload.comment)
    if task is None:
        raise HTTPException(status_code=404, detail="Approval task not found")
    return ApprovalTaskRead.model_validate(task)


@router.post("/{approval_id}/reject", response_model=ApprovalTaskRead)
def reject_endpoint(approval_id: int, payload: ApprovalAction, db: Session = Depends(get_db)) -> ApprovalTaskRead:
    task = reject_task(db, approval_id, payload.reviewer_id, payload.comment)
    if task is None:
        raise HTTPException(status_code=404, detail="Approval task not found")
    return ApprovalTaskRead.model_validate(task)
