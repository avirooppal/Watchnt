from fastapi import APIRouter, HTTPException
import os
import json
from services.llm_service import LLMService

router = APIRouter()
llm_service = LLMService()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MEETINGS_DIR = os.path.join(BASE_DIR, "meetings")

@router.post("/summary/{meeting_id}")
async def generate_summary(meeting_id: str):
    meeting_dir = os.path.join(MEETINGS_DIR, meeting_id)
    transcript_path = os.path.join(meeting_dir, "transcript.json")
    
    if not os.path.exists(transcript_path):
        raise HTTPException(status_code=404, detail="Transcript not found. Please transcribe the meeting first.")
        
    with open(transcript_path, "r") as f:
        data = json.load(f)
        
    segments = data.get("segments", [])
    if not segments:
        raise HTTPException(status_code=400, detail="Transcript is empty.")
        
    try:
        summary_text = await llm_service.summarize_meeting(segments)
        
        # Save summary.md (Task 5.5)
        summary_path = os.path.join(meeting_dir, "summary.md")
        with open(summary_path, "w", encoding="utf-8") as f:
            f.write(summary_text)
            
        return {"summary": summary_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
