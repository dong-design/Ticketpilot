import json
import re
from dataclasses import dataclass

from openai import OpenAI

from app.agents.prompts import triage_system_prompt
from app.core.config import get_settings
from app.models.ticket import Ticket

settings = get_settings()

REFUND_KEYWORDS = [
    "refund",
    "chargeback",
    "return my money",
    "退款",
    "退货",
    "返现",
    "商品损坏",
    "损坏",
    "破损",
    "退钱",
]

ORDER_KEYWORDS = [
    "where is my order",
    "shipment",
    "tracking",
    "deliver",
    "订单",
    "物流",
    "快递",
    "发货",
    "配送",
    "到货",
]

ACCOUNT_KEYWORDS = [
    "login",
    "password",
    "account",
    "locked out",
    "登录",
    "密码",
    "账号",
    "账户",
    "锁定",
]


@dataclass
class TriageResult:
    category: str
    priority: str
    summary: str
    recommended_action: str
    order_id: str | None = None


def analyze_ticket(ticket: Ticket) -> TriageResult:
    if settings.openai_api_key:
        try:
            return _analyze_with_openai(ticket)
        except Exception:
            return _analyze_with_rules(ticket)
    return _analyze_with_rules(ticket)


def _analyze_with_openai(ticket: Ticket) -> TriageResult:
    client = OpenAI(api_key=settings.openai_api_key)
    response = client.responses.create(
        model=settings.openai_model,
        input=[
            {"role": "system", "content": triage_system_prompt()},
            {"role": "user", "content": f"Title: {ticket.title}\nContent: {ticket.content}"},
        ],
    )
    payload = json.loads(response.output_text)
    return TriageResult(
        category=payload["category"],
        priority=payload["priority"],
        summary=payload["summary"],
        recommended_action=payload["recommended_action"],
        order_id=payload.get("order_id"),
    )


def _analyze_with_rules(ticket: Ticket) -> TriageResult:
    content = f"{ticket.title} {ticket.content}".lower()
    order_id = _extract_order_id(content)

    if any(keyword in content for keyword in REFUND_KEYWORDS):
        category = "refund"
        priority = "high"
        recommended_action = "request_refund"
    elif any(keyword in content for keyword in ORDER_KEYWORDS):
        category = "order"
        priority = "medium"
        recommended_action = "draft_reply"
    elif any(keyword in content for keyword in ACCOUNT_KEYWORDS):
        category = "account"
        priority = "high"
        recommended_action = "escalate"
    else:
        category = "general"
        priority = "low"
        recommended_action = "draft_reply"

    summary = ticket.content.strip().replace("\n", " ")
    if len(summary) > 140:
        summary = f"{summary[:137]}..."

    return TriageResult(
        category=category,
        priority=priority,
        summary=summary,
        recommended_action=recommended_action,
        order_id=order_id,
    )


def _extract_order_id(content: str) -> str | None:
    match = re.search(r"(?:order|订单)?[\s#:：=-]*(\d{5,12})", content)
    if match:
        return match.group(1)
    return None
