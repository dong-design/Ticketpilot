from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.schemas.run import AgentRunRead, AgentRunStepsRead
from app.services.run_service import create_run_for_ticket, get_run, get_run_steps

router = APIRouter(prefix="/runs", tags=["runs"])
tickets_router = APIRouter(prefix="/tickets", tags=["runs"])


@tickets_router.post("/{ticket_id}/run", response_model=AgentRunRead, status_code=status.HTTP_202_ACCEPTED)
def create_run_endpoint(ticket_id: int, db: Session = Depends(get_db)) -> AgentRunRead:
    run = create_run_for_ticket(db, ticket_id)
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    return AgentRunRead.model_validate(run)


@router.get("/{run_id}", response_model=AgentRunRead)
def get_run_endpoint(run_id: int, db: Session = Depends(get_db)) -> AgentRunRead:
    run = get_run(db, run_id)
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")
    return AgentRunRead.model_validate(run)


@router.get("/{run_id}/steps", response_model=AgentRunStepsRead)
def get_run_steps_endpoint(run_id: int, db: Session = Depends(get_db)) -> AgentRunStepsRead:
    steps = get_run_steps(db, run_id)
    if steps is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")
    return steps
