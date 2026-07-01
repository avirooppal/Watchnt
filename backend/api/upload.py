from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from fastapi import Depends
import os
import shutil
import uuid
from database.db import SessionLocal
from database.models import Meeting
from schemas.status import MeetingStatus
from services.pipeline_service import PipelineService

router = APIRouter()
pipeline_service = PipelineService()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MEETINGS_DIR = os.path.join(BASE_DIR, "meetings")

@router.post("/upload")
async def upload_audio(
    background_tasks: BackgroundTasks,
    meeting_id: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    if not meeting_id:
        raise HTTPException(status_code=400, detail="meeting_id is required")
        
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    meeting_dir = os.path.join(MEETINGS_DIR, meeting_id)
    os.makedirs(meeting_dir, exist_ok=True)
    
    file_path = os.path.join(meeting_dir, "audio.webm")
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    job_id = str(uuid.uuid4())
    meeting.job_id = job_id
    meeting.status = MeetingStatus.UPLOADING.value
    db.commit()

    # Start the pipeline in the background
    background_tasks.add_task(pipeline_service.process_meeting, meeting_id)
        
    return {"message": "Audio saved and processing started", "job_id": job_id, "status": meeting.status}
