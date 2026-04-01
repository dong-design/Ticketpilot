from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_current_user
from app.schemas.metrics import MetricsSummary
from app.services.metrics_service import get_metrics_summary

router = APIRouter(prefix="/metrics", tags=["metrics"])


@router.get("/summary", response_model=MetricsSummary)
def metrics_summary(_: dict = Depends(get_current_user), db: Session = Depends(get_db)) -> MetricsSummary:
    return get_metrics_summary(db)
