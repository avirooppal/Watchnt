from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from fastapi import Depends
import os
import json
import uuid
from core.deps import get_db, validate_meeting_id
from pydantic import BaseModel, Field, TypeAdapter, ValidationError
from core.paths import MEETINGS_DIR
from database.db import SessionLocal
from database.models import Meeting
from schemas.status import MeetingStatus
from services.pipeline_service import PipelineService

class TranscriptSegment(BaseModel):
    text: str = Field(max_length=20000)
    speaker: str = Field(default="Unknown", max_length=200)
    start: float | None = Field(default=None, ge=0)
    end: float | None = Field(default=None, ge=0)
    timestamp: str | None = None
    language: str | None = None
    confidence: float | None = Field(default=None, ge=0, le=1)

router = APIRouter()
pipeline_service = PipelineService()
@router.post("/upload_transcript")
async def upload_transcript(
    background_tasks: BackgroundTasks,
    meeting_id: str = Form(...),
    transcript_json: str = Form(...),
    db: Session = Depends(get_db)
):
    meeting_id = validate_meeting_id(meeting_id)
    if len(transcript_json) > 10_000_000:
        raise HTTPException(413, "Transcript too large")
    try:
        parsed = TypeAdapter(list[TranscriptSegment]).validate_json(transcript_json)
        parsed = [segment.model_dump(exclude_none=True) for segment in parsed]
    except (ValueError, ValidationError):
        raise HTTPException(422, "Invalid transcript segments")
    if not meeting_id:
        raise HTTPException(status_code=400, detail="meeting_id is required")
        
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    if meeting.status in {"EXTRACTING_INTELLIGENCE", "PERSISTING_MODEL", "TRANSCRIBING", "UPLOADING"}:
        raise HTTPException(409, "Meeting is already processing")
    meeting_dir = os.path.join(MEETINGS_DIR, meeting_id)
    os.makedirs(meeting_dir, exist_ok=True)
    
    transcript_path = os.path.join(meeting_dir, "transcript.json")
    
    with open(transcript_path, "w", encoding="utf-8") as f:
        # Wrap the array in {"segments": ...}

        json.dump({"segments": parsed}, f, indent=2)
        
    job_id = str(uuid.uuid4())
    meeting.job_id = job_id
    meeting.status = MeetingStatus.UPLOADING.value
    db.commit()

    # Start the pipeline in the background
    background_tasks.add_task(pipeline_service.process_transcript, meeting_id)
        
    return {"message": "Transcript saved and processing started", "meeting_id": meeting_id, "job_id": job_id, "status": meeting.status}

