from fastapi import APIRouter, UploadFile, File

router = APIRouter()

@router.post("/upload")
async def upload_audio(file: UploadFile = File(...)):
    # For Task 2.5, we just need to verify the backend receives the file
    return {
        "filename": file.filename, 
        "content_type": file.content_type
    }
