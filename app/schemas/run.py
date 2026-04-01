from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.approval import ApprovalTaskRead


class AgentRunRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ticket_id: int
    status: str
    model: str
    trace_id: str | None
    error_message: str | None
    input_tokens: int | None
    output_tokens: int | None
    started_at: datetime
    finished_at: datetime | None


class ToolCallRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tool_name: str
    tool_input: dict
    tool_output: dict | None
    status: str
    latency_ms: int | None
    created_at: datetime


class AgentRunStepsRead(BaseModel):
    run: AgentRunRead
    tool_calls: list[ToolCallRead]
    approvals: list[ApprovalTaskRead]
