def build_refund_request(order_id: str, reason: str) -> dict:
    return {
        "order_id": order_id,
        "reason": reason,
        "amount": "TBD",
        "requires_human_approval": True,
    }
