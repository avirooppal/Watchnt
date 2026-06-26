from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from pydantic import BaseModel
import shutil
import os
import uuid
from app.workers.transcription import transcribe_audio_chunk

router = APIRouter()

class MeetingCreate(BaseModel):
    title: str
    source: str = "extension"

class MeetingResponse(BaseModel):
    id: str
    title: str
    status: str

@router.post("/", response_model=MeetingResponse)
async def create_meeting(meeting: MeetingCreate):
    """
    Create a new meeting session.
    """
    meeting_id = str(uuid.uuid4())
    # Database persistence goes here
    return MeetingResponse(id=meeting_id, title=meeting.title, status="active")

@router.post("/{meeting_id}/audio")
async def upload_audio_chunk(meeting_id: str, audio: UploadFile = File(...)):
    """
    Upload an audio chunk for an active meeting.
    This triggers the Celery worker to transcribe the chunk.
    """
    if not audio.filename:
        raise HTTPException(status_code=400, detail="No audio file provided")
        
    # In a full implementation, we would upload to MinIO here.
    # For scaffolding, we save to a temporary local disk location.
    temp_dir = f"/tmp/watchnt/{meeting_id}"
    os.makedirs(temp_dir, exist_ok=True)
    file_path = os.path.join(temp_dir, audio.filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(audio.file, buffer)
        
    # Queue the transcription Celery task asynchronously
    task = transcribe_audio_chunk.delay(meeting_id=meeting_id, audio_file_path=file_path)
    
    return {"status": "processing", "task_id": task.id}
