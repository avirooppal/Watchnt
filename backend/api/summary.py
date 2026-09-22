from fastapi import APIRouter, HTTPException
import os
import json
from services.llm_service import LLMService
from core.deps import validate_meeting_id

from core.paths import MEETINGS_DIR

router = APIRouter()
llm_service = LLMService()
@router.post("/summary/{meeting_id}")
async def generate_summary(meeting_id: str):
    meeting_id = validate_meeting_id(meeting_id)
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
        summary_text = await llm_service.generate_summary("\n".join(s["text"] for s in segments))
        
        # Save summary.md (Task 5.5)
        summary_path = os.path.join(meeting_dir, "summary.md")
        with open(summary_path, "w", encoding="utf-8") as f:
            f.write(json.dumps(summary_text, ensure_ascii=False, indent=2))
            
        return {"summary": summary_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
