from datetime import datetime

from pydantic import BaseModel, ConfigDict


class TicketCreate(BaseModel):
    title: str
    content: str
    channel: str = "web"
    created_by: int | None = None


class TicketRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    content: str
    channel: str
    status: str
    priority: str | None
    category: str | None
    created_by: int | None
    assigned_to: int | None
    created_at: datetime
    updated_at: datetime
