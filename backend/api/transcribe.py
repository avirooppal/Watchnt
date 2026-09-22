from fastapi import APIRouter, HTTPException
import os
import asyncio
from core.deps import validate_meeting_id
import json
from services.transcription_service import TranscriptionService

from core.paths import MEETINGS_DIR

router = APIRouter()
transcription_service = TranscriptionService()
@router.post("/transcribe/{meeting_id}")
async def transcribe_audio(meeting_id: str):
    meeting_id = validate_meeting_id(meeting_id)
    meeting_dir = os.path.join(MEETINGS_DIR, meeting_id)
    audio_path = os.path.join(meeting_dir, "audio.wav")
    
    if not os.path.exists(audio_path):
        raise HTTPException(status_code=404, detail="Audio file not found for this meeting")
        
    try:
        segments = await asyncio.to_thread(transcription_service.transcribe, audio_path)
        
        # Save transcript.json
        transcript_path = os.path.join(meeting_dir, "transcript.json")
        with open(transcript_path, "w") as f:
            json.dump({"segments": segments}, f, indent=2)
            
        return {"segments": segments}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
