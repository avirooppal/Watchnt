from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from database.db import SessionLocal
from database.models import Meeting
from schemas.meeting import MeetingCreate, MeetingResponse, MeetingUpdate, ChatRequest
from core.deps import get_db, validate_meeting_id
from core.paths import MEETINGS_DIR
from services.pipeline_service import PipelineService
from services.llm_service import LLMService
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
    
    data = {}
    
    metadata_path = os.path.join(meeting_dir, "metadata.json")
    if os.path.exists(metadata_path):
        with open(metadata_path, "r", encoding="utf-8") as f:
            data["metadata"] = json.load(f)
            
    summary_path = os.path.join(meeting_dir, "summary.md")
    if os.path.exists(summary_path):
        with open(summary_path, "r", encoding="utf-8") as f:
            data["summary"] = f.read()
            
    transcript_path = os.path.join(meeting_dir, "transcript.json")
    if os.path.exists(transcript_path):
        with open(transcript_path, "r", encoding="utf-8") as f:
            data["transcript"] = json.load(f)
            
    actions_path = os.path.join(meeting_dir, "actions.json")
    if os.path.exists(actions_path):
        with open(actions_path, "r", encoding="utf-8") as f:
            try:
                data["actions"] = json.load(f)
            except (json.JSONDecodeError, ValueError):
                data["actions"] = f.read()

    email_path = os.path.join(meeting_dir, "email.html")
    if os.path.exists(email_path):
        with open(email_path, "r", encoding="utf-8") as f:
            data["email"] = f.read()
                
    return data

@router.get("/meeting/{meeting_id}/status")
def get_meeting_status(meeting_id: str, db: Session = Depends(get_db)):
    meeting_id = validate_meeting_id(meeting_id)
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return {"status": meeting.status, "job_id": meeting.job_id}



@router.patch("/meeting/{meeting_id}")
def update_meeting(meeting_id: str, update_data: MeetingUpdate, db: Session = Depends(get_db)):
    meeting_id = validate_meeting_id(meeting_id)
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
        
    if update_data.title:
        meeting.title = update_data.title
        
    db.commit()
    db.refresh(meeting)
    
    # Update title in metadata.json if it exists
    meeting_dir = os.path.join(MEETINGS_DIR, meeting_id)
    metadata_path = os.path.join(meeting_dir, "metadata.json")
    if os.path.exists(metadata_path):
        with open(metadata_path, "r", encoding="utf-8") as f:
            meta = json.load(f)
        meta["title"] = meeting.title
        with open(metadata_path, "w", encoding="utf-8") as f:
            json.dump(meta, f, indent=2)
            
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
        actions_path = os.path.join(MEETINGS_DIR, meeting.id, "actions.json")
        if os.path.exists(actions_path):
            try:
                with open(actions_path, "r", encoding="utf-8") as f:
                    actions = json.load(f)
                    if isinstance(actions, list):
                        total_actions += len(actions)
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
        
    meeting.status = MeetingStatus.TRANSCRIBING.value
    db.commit()
    
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
