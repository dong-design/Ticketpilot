import redis

from app.core.config import get_settings

settings = get_settings()
client = redis.Redis.from_url(settings.redis_url, decode_responses=True)


def enqueue_run(run_id: int) -> None:
    client.rpush(settings.queue_name, run_id)


def dequeue_run(timeout_seconds: int = 5) -> int | None:
    item = client.blpop(settings.queue_name, timeout=timeout_seconds)
    if item is None:
        return None
    _, run_id = item
    return int(run_id)
