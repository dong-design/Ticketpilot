from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ApprovalAction(BaseModel):
    reviewer_id: int | None = None
    comment: str | None = None


class ApprovalTaskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    run_id: int
    ticket_id: int
    action_type: str
    action_payload: dict
    status: str
    reviewed_by: int | None
    review_comment: str | None
    created_at: datetime
    reviewed_at: datetime | None
