from fastapi import APIRouter, UploadFile, File, Form, HTTPException
import os
import shutil

router = APIRouter()

# The meetings directory is at the root of the monorepo, so one level up from backend/
# __file__ is in backend/api/, so __file__ -> api -> backend -> WatchNT -> meetings
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MEETINGS_DIR = os.path.join(BASE_DIR, "meetings")

@router.post("/upload")
async def upload_audio(
    meeting_id: str = Form(...),
    file: UploadFile = File(...)
):
    if not meeting_id:
        raise HTTPException(status_code=400, detail="meeting_id is required")
        
    meeting_dir = os.path.join(MEETINGS_DIR, meeting_id)
    os.makedirs(meeting_dir, exist_ok=True)
    
    file_path = os.path.join(meeting_dir, "audio.wav")
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {"message": "Audio saved successfully", "file": "audio.wav"}
