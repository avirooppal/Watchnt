import os
from celery import Celery

redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "watchnt",
    broker=redis_url,
    backend=redis_url,
    include=["app.workers.transcription", "app.workers.diarization", "app.workers.intelligence", "app.workers.embedding"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)
