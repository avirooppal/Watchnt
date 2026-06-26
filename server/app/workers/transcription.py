import os
import asyncio
from typing import List, Dict, Any
from .celery_app import celery_app

# Delay loading faster_whisper until the worker starts
_whisper_model = None

def get_model():
    global _whisper_model
    if _whisper_model is None:
        from faster_whisper import WhisperModel
        model_size = os.environ.get("WHISPER_MODEL", "large-v3")
        device = "cuda" if os.environ.get("USE_CUDA") == "1" else "cpu"
        compute_type = "float16" if device == "cuda" else "int8"
        _whisper_model = WhisperModel(model_size, device=device, compute_type=compute_type)
    return _whisper_model

@celery_app.task(bind=True, max_retries=3)
def transcribe_audio_chunk(self, meeting_id: str, audio_file_path: str) -> List[Dict[str, Any]]:
    """
    Celery task to transcribe a downloaded audio chunk using faster-whisper.
    Returns a list of timestamped segments.
    """
    try:
        model = get_model()
        segments, info = model.transcribe(audio_file_path, beam_size=5)
        
        results = []
        for segment in segments:
            results.append({
                "start": segment.start,
                "end": segment.end,
                "text": segment.text.strip(),
                "confidence": segment.no_speech_prob
            })
            
        # In a full implementation, we'd save this to the DB and push via WS
        # For now, we return the parsed segments for the caller/pipeline
        return results
    except Exception as exc:
        # Retry with exponential backoff on failure
        raise self.retry(exc=exc, countdown=2 ** self.request.retries)
