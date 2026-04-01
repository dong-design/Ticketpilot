from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.ticket import Ticket


def create_ticket_record(db: Session, *, title: str, content: str, channel: str, created_by: int | None) -> Ticket:
    ticket = Ticket(title=title, content=content, channel=channel, created_by=created_by)
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket


def get_ticket_record(db: Session, ticket_id: int) -> Ticket | None:
    return db.get(Ticket, ticket_id)


def list_ticket_records(db: Session) -> list[Ticket]:
    return list(db.scalars(select(Ticket).order_by(Ticket.id.desc())))
