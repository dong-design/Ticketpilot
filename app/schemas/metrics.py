from pydantic import BaseModel


class MetricsSummary(BaseModel):
    ticket_count: int
    resolved_ticket_count: int
    approval_pending_count: int
    run_count: int
    completed_run_count: int
    average_tool_latency_ms: float
    run_completion_rate: float
