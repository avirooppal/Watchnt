import os
from typing import List, Dict, Any
from .celery_app import celery_app

_diarization_pipeline = None

def get_pipeline():
    global _diarization_pipeline
    if _diarization_pipeline is None:
        from pyannote.audio import Pipeline
        import torch
        # A valid HuggingFace token must be provided in the environment 
        # as pyannote models are gated.
        hf_token = os.environ.get("HF_TOKEN")
        if not hf_token:
            raise ValueError("HF_TOKEN environment variable is required for pyannote.audio")
        
        _diarization_pipeline = Pipeline.from_pretrained(
            "pyannote/speaker-diarization-3.1",
            use_auth_token=hf_token
        )
        
        device = torch.device("cuda" if os.environ.get("USE_CUDA") == "1" else "cpu")
        _diarization_pipeline.to(device)
        
    return _diarization_pipeline

@celery_app.task(bind=True, max_retries=3)
def diarize_audio(self, meeting_id: str, audio_file_path: str, segments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Celery task to perform speaker diarization on the audio and align it with the transcribed segments.
    """
    try:
        pipeline = get_pipeline()
        
        # Run diarization on the full audio file
        diarization = pipeline(audio_file_path)
        
        speaker_timeline = []
        for turn, _, speaker in diarization.itertracks(yield_label=True):
            speaker_timeline.append({
                "start": turn.start,
                "end": turn.end,
                "speaker": speaker
            })
            
        # Align diarization with transcript segments
        aligned_segments = []
        for segment in segments:
            # Find the speaker that overlaps the most with this segment
            # Simplified intersection for scaffolding: find midpoint of segment
            midpoint = (segment["start"] + segment["end"]) / 2.0
            
            assigned_speaker = "UNKNOWN"
            for turn in speaker_timeline:
                if turn["start"] <= midpoint <= turn["end"]:
                    assigned_speaker = turn["speaker"]
                    break
                    
            segment["speaker"] = assigned_speaker
            aligned_segments.append(segment)
            
        # In the full implementation, this step would also:
        # 1. Update the speakers table to track unique speakers in the meeting
        # 2. Compute talk-time analytics
        # 3. Save aligned segments to DB
        return aligned_segments
        
    except Exception as exc:
        raise self.retry(exc=exc, countdown=2 ** self.request.retries)
