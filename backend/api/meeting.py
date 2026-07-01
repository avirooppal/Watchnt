from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database.db import SessionLocal
from database.models import Meeting
from schemas.meeting import MeetingCreate, MeetingResponse

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

import os
import json

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MEETINGS_DIR = os.path.join(BASE_DIR, "meetings")

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
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        return {"error": "Meeting not found"}
        
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
            except:
                data["actions"] = f.read()

    email_path = os.path.join(meeting_dir, "email.html")
    if os.path.exists(email_path):
        with open(email_path, "r", encoding="utf-8") as f:
            data["email"] = f.read()
                
    return data

@router.get("/meeting/{meeting_id}/status")
def get_meeting_status(meeting_id: str, db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        return {"error": "Meeting not found"}
    return {"status": meeting.status, "job_id": meeting.job_id}
