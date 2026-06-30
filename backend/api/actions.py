from fastapi import APIRouter, HTTPException
import os
import json
from services.llm_service import LLMService

router = APIRouter()
llm_service = LLMService()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MEETINGS_DIR = os.path.join(BASE_DIR, "meetings")

@router.post("/actions/{meeting_id}")
async def generate_actions(meeting_id: str):
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
        actions_text = await llm_service.extract_action_items(segments)
        # Try to parse the JSON array from the LLM
        # Some LLMs might wrap it in markdown block like ```json ... ```
        clean_text = actions_text.strip()
        if clean_text.startswith("```json"):
            clean_text = clean_text[7:]
        if clean_text.startswith("```"):
            clean_text = clean_text[3:]
        if clean_text.endswith("```"):
            clean_text = clean_text[:-3]
        clean_text = clean_text.strip()
            
        try:
            actions_list = json.loads(clean_text)
        except json.JSONDecodeError:
            # Fallback if it didn't return valid JSON
            actions_list = [item.strip("-* ") for item in clean_text.split("\n") if item.strip()]

        # Save actions.json (Task 6.3)
        actions_path = os.path.join(meeting_dir, "actions.json")
        with open(actions_path, "w", encoding="utf-8") as f:
            json.dump(actions_list, f, indent=2)
            
        return {"actions": actions_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
