import asyncio
from typing import Dict, Any, List
from .celery_app import celery_app

@celery_app.task(bind=True, max_retries=3)
def process_meeting_intelligence(self, meeting_id: str, transcript: str, speakers: List[str]) -> Dict[str, Any]:
    """
    Celery task that acts as the entrypoint for the AI intelligence pipeline.
    Triggered when a meeting ends.
    """
    from app.ai.pipeline import run_intelligence_pipeline
    
    try:
        # Since run_intelligence_pipeline is async and celery tasks are sync,
        # we run the event loop to execute the pipeline.
        result = asyncio.run(run_intelligence_pipeline(transcript, speakers))
        
        # In a complete implementation, we'd save this result to the database,
        # emit a websocket event to the client, and trigger the notification/embedding tasks.
        
        return result
    except Exception as exc:
        raise self.retry(exc=exc, countdown=2 ** self.request.retries)
