from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.approvals import router as approvals_router
from app.api.health import router as health_router
from app.api.runs import router as runs_router
from app.api.runs import tickets_router as ticket_runs_router
from app.api.tickets import router as tickets_router
from app.core.config import get_settings
from app.core.db import init_db
from app.core.logging import configure_logging


@asynccontextmanager
async def lifespan(_: FastAPI):
    configure_logging()
    init_db()
    yield


settings = get_settings()
app = FastAPI(title=settings.app_name, lifespan=lifespan)
app.include_router(health_router)
app.include_router(tickets_router)
app.include_router(ticket_runs_router)
app.include_router(runs_router)
app.include_router(approvals_router)
