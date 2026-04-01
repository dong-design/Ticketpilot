def get_order_info(order_id: str) -> dict:
    return {
        "order_id": order_id,
        "status": "in_transit",
        "estimated_delivery_days": 2,
    }
