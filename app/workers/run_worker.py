import logging
import time

from app.core.config import get_settings
from app.core.db import SessionLocal
from app.services.run_service import process_run
from app.workers.queue import dequeue_run

logger = logging.getLogger(__name__)
settings = get_settings()


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s [worker] %(message)s")
    if settings.queue_backend != "redis":
        logger.info(
            "Worker not started because QUEUE_BACKEND=%s. "
            "Runs are processed inline in local mode.",
            settings.queue_backend,
        )
        return

    logger.info("Run worker started")
    while True:
        run_id = dequeue_run()
        if run_id is None:
            continue

        with SessionLocal() as db:
            logger.info("Processing run %s", run_id)
            process_run(db, run_id)
        time.sleep(0.2)


if __name__ == "__main__":
    main()
