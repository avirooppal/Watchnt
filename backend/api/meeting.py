from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from database.db import SessionLocal
from database.models import Meeting
from schemas.meeting import MeetingCreate, MeetingResponse, MeetingUpdate, ChatRequest
from core.deps import get_db, validate_meeting_id
from core.paths import MEETINGS_DIR
from services.pipeline_service import PipelineService
from services.llm_service import LLMService
from services.action_review import apply_reviews
from schemas.status import MeetingStatus
import os
import json
import shutil
router = APIRouter()
pipeline_service = PipelineService()
llm_service = LLMService()

@router.post("/meeting", response_model=MeetingResponse)
def create_meeting(meeting: MeetingCreate, db: Session = Depends(get_db)):
    db_meeting = Meeting(title=meeting.title)
    db.add(db_meeting)
    db.commit()
    db.refresh(db_meeting)
    
    # Task 10.1 & 10.2 Create Meeting Folder & Metadata
    meeting_dir = os.path.join(MEETINGS_DIR, db_meeting.id)
    os.makedirs(meeting_dir, exist_ok=True)
    
    metadata_path = os.path.join(meeting_dir, "metadata.json")
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump({
            "id": db_meeting.id,
            "title": db_meeting.title,
            "created_at": db_meeting.created_at.isoformat()
        }, f, indent=2)
        
    return db_meeting

@router.get("/meetings", response_model=list[MeetingResponse])
def get_meetings(db: Session = Depends(get_db)):
    return db.query(Meeting).all()

@router.get("/meeting/{meeting_id}")
def get_meeting_details(meeting_id: str, db: Session = Depends(get_db)):
    meeting_id = validate_meeting_id(meeting_id)
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
        
    meeting_dir = os.path.join(MEETINGS_DIR, meeting_id)
    
    data = {"meeting": {"id": meeting.id, "title": meeting.title, "status": meeting.status, "created_at": meeting.created_at.isoformat()}}
    
    meeting_json_path = os.path.join(meeting_dir, "meeting.json")
    if os.path.exists(meeting_json_path):
        with open(meeting_json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            if "meeting" not in data:
                data["meeting"] = {}
            data["meeting"].update({"id": meeting.id, "title": meeting.title, "status": meeting.status})
            
    transcript_path = os.path.join(meeting_dir, "transcript.json")
    if os.path.exists(transcript_path):
        with open(transcript_path, "r", encoding="utf-8") as f:
            data["transcript"] = json.load(f)
                
    actions = data.get("ai", {}).get("actions", {})
    if isinstance(actions.get("data"), list):
        actions["data"] = apply_reviews(meeting_id, actions["data"])
    return data

@router.get("/meeting/{meeting_id}/status")
def get_meeting_status(meeting_id: str, db: Session = Depends(get_db)):
    meeting_id = validate_meeting_id(meeting_id)
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    error = None
    path = os.path.join(MEETINGS_DIR, meeting_id, "meeting.json")
    if meeting.status == "FAILED" and os.path.exists(path):
        with open(path, encoding="utf-8") as source:
            saved = json.load(source)
        error = saved.get("capture_error") or next((stage.get("error") for stage in saved.get("ai", {}).values() if stage.get("error")), None)
    if meeting.status == "FAILED" and not error:
        error = "AI processing did not finish. Your saved transcript is available in the meeting. Check the selected model in Settings, then retry processing."
    return {"status": meeting.status, "job_id": meeting.job_id, "error": error}



@router.patch("/meeting/{meeting_id}")
def update_meeting(meeting_id: str, update_data: MeetingUpdate, db: Session = Depends(get_db)):
    meeting_id = validate_meeting_id(meeting_id)
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
        
    if update_data.title is not None:
        meeting.title = update_data.title
    if "folder_id" in update_data.model_fields_set:
        meeting.folder_id = update_data.folder_id
        
    db.commit()
    db.refresh(meeting)
    
    # Update title in meeting.json if it exists
    meeting_dir = os.path.join(MEETINGS_DIR, meeting_id)
    meeting_json_path = os.path.join(meeting_dir, "meeting.json")
    if os.path.exists(meeting_json_path):
        with open(meeting_json_path, "r", encoding="utf-8") as f:
            meeting_model = json.load(f)
        if "meeting" in meeting_model:
            meeting_model["meeting"]["title"] = meeting.title
        with open(meeting_json_path, "w", encoding="utf-8") as f:
            json.dump(meeting_model, f, indent=2)
            
    return meeting

@router.delete("/meeting/{meeting_id}")
def delete_meeting(meeting_id: str, db: Session = Depends(get_db)):
    meeting_id = validate_meeting_id(meeting_id)
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
        
    db.delete(meeting)
    db.commit()
    
    meeting_dir = os.path.join(MEETINGS_DIR, meeting_id)
    if os.path.exists(meeting_dir):
        shutil.rmtree(meeting_dir)
        
    return {"success": True}

@router.get("/meetings/insights")
def get_meetings_insights(db: Session = Depends(get_db)):
    meetings = db.query(Meeting).all()
    total_meetings = len(meetings)
    total_actions = 0
    
    for meeting in meetings:
        meeting_json_path = os.path.join(MEETINGS_DIR, meeting.id, "meeting.json")
        if os.path.exists(meeting_json_path):
            try:
                with open(meeting_json_path, "r", encoding="utf-8") as f:
                    meeting_model = json.load(f)
                    total_actions += meeting_model.get("analytics", {}).get("action_items", 0)
            except:
                pass
                
    return {
        "total_meetings": total_meetings,
        "total_action_items": total_actions
    }

@router.post("/meeting/{meeting_id}/retry")
def retry_meeting(meeting_id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    meeting_id = validate_meeting_id(meeting_id)
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
        
    if meeting.status not in {MeetingStatus.COMPLETED.value, MeetingStatus.FAILED.value}:
        raise HTTPException(409, "Meeting is already processing")
    retry_failed = meeting.status == MeetingStatus.FAILED.value
    meeting.status = MeetingStatus.TRANSCRIBING.value
    db.commit()
    
    has_transcript = os.path.exists(os.path.join(MEETINGS_DIR, meeting_id, "transcript.json"))
    if has_transcript:
        background_tasks.add_task(pipeline_service.process_transcript, meeting_id, retry_failed=retry_failed)
    else:
        background_tasks.add_task(pipeline_service.process_meeting, meeting_id)
    return {"status": "retrying"}

@router.post("/meeting/{meeting_id}/chat")
async def chat_with_meeting(meeting_id: str, request: ChatRequest, db: Session = Depends(get_db)):
    meeting_id = validate_meeting_id(meeting_id)
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
        
    transcript_path = os.path.join(MEETINGS_DIR, meeting_id, "transcript.json")
    if not os.path.exists(transcript_path):
        raise HTTPException(status_code=400, detail="Transcript not found for this meeting")
        
    with open(transcript_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        segments = data.get("segments", [])
        
    messages_list = [{"role": m.role, "content": m.content} for m in request.messages]
    response_text = await llm_service.chat_with_meeting(segments, messages_list)
    return {"response": response_text}
