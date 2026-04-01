from sqlalchemy.orm import Session

from app.repositories.tickets import create_ticket_record, get_ticket_record, list_ticket_records
from app.schemas.ticket import TicketCreate


def create_ticket(db: Session, payload: TicketCreate, created_by: int | None = None):
    return create_ticket_record(
        db,
        title=payload.title,
        content=payload.content,
        channel=payload.channel,
        created_by=created_by if created_by is not None else payload.created_by,
    )


def get_ticket(db: Session, ticket_id: int):
    return get_ticket_record(db, ticket_id)


def list_tickets(db: Session):
    return list_ticket_records(db)
