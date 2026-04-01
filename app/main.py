from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.auth import router as auth_router
from app.api.approvals import router as approvals_router
from app.api.health import router as health_router
from app.api.metrics import router as metrics_router
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
app.include_router(auth_router)
app.include_router(health_router)
app.include_router(tickets_router)
app.include_router(ticket_runs_router)
app.include_router(runs_router)
app.include_router(approvals_router)
app.include_router(metrics_router)

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
UI_DIR = BASE_DIR / "ui"

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/", include_in_schema=False)
def index() -> FileResponse:
    return FileResponse(UI_DIR / "index.html")
#test  saff f
