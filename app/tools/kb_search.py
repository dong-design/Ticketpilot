def search_knowledge_base(query: str) -> dict:
    return {
        "matched_articles": [
            {
                "title": "Refund policy and review window",
                "snippet": "Refund requests above the threshold require human approval.",
            },
            {
                "title": "Order tracking troubleshooting",
                "snippet": "Customers should receive a tracking update within 24 hours.",
            },
        ],
        "query": query,
    }
