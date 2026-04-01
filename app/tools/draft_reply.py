def draft_reply(summary: str, category: str) -> dict:
    return {
        "subject": f"[{category}] Ticket update",
        "body": (
            "Thanks for reaching out. "
            f"We reviewed your request and captured the following summary: {summary}"
        ),
    }
