from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.schemas.ticket import TicketCreate, TicketRead
from app.services.ticket_service import create_ticket, get_ticket, list_tickets

router = APIRouter(prefix="/tickets", tags=["tickets"])


@router.post("", response_model=TicketRead, status_code=status.HTTP_201_CREATED)
def create_ticket_endpoint(payload: TicketCreate, db: Session = Depends(get_db)) -> TicketRead:
    ticket = create_ticket(db, payload)
    return TicketRead.model_validate(ticket)


@router.get("", response_model=list[TicketRead])
def list_tickets_endpoint(db: Session = Depends(get_db)) -> list[TicketRead]:
    tickets = list_tickets(db)
    return [TicketRead.model_validate(ticket) for ticket in tickets]


@router.get("/{ticket_id}", response_model=TicketRead)
def get_ticket_endpoint(ticket_id: int, db: Session = Depends(get_db)) -> TicketRead:
    ticket = get_ticket(db, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    return TicketRead.model_validate(ticket)
