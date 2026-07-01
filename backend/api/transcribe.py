from fastapi import APIRouter, HTTPException
import os
import json
from services.transcription_service import TranscriptionService

router = APIRouter()
transcription_service = TranscriptionService()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MEETINGS_DIR = os.path.join(BASE_DIR, "meetings")

@router.post("/transcribe/{meeting_id}")
async def transcribe_audio(meeting_id: str):
    meeting_dir = os.path.join(MEETINGS_DIR, meeting_id)
    audio_path = os.path.join(meeting_dir, "audio.wav")
    
    if not os.path.exists(audio_path):
        raise HTTPException(status_code=404, detail="Audio file not found for this meeting")
        
    try:
        segments = transcription_service.transcribe(audio_path)
        
        # Save transcript.json
        transcript_path = os.path.join(meeting_dir, "transcript.json")
        with open(transcript_path, "w") as f:
            json.dump({"segments": segments}, f, indent=2)
            
        return {"segments": segments}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
