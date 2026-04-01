import redis

from app.core.config import get_settings

settings = get_settings()


def get_client() -> redis.Redis:
    return redis.Redis.from_url(settings.redis_url, decode_responses=True)


def enqueue_run(run_id: int) -> None:
    get_client().rpush(settings.queue_name, run_id)


def dequeue_run(timeout_seconds: int = 5) -> int | None:
    item = get_client().blpop(settings.queue_name, timeout=timeout_seconds)
    if item is None:
        return None
    _, run_id = item
    return int(run_id)
