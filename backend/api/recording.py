"""Stream meeting recordings to local disk without buffering a whole meeting."""
import os
import shutil
import re
from pathlib import Path

from fastapi import APIRouter, Depends, File, Header, HTTPException, UploadFile
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session

from core.deps import get_db, validate_meeting_id
from core.paths import MEETINGS_DIR
from database.models import Meeting

router = APIRouter()
MAX_CHUNK = 16 * 1024 * 1024


@router.get("/recording/capabilities")
def recording_capabilities():
    return {"video": True}


def recording_directory(meeting_id: str, db: Session) -> Path:
    meeting_id = validate_meeting_id(meeting_id)
    if not db.get(Meeting, meeting_id):
        raise HTTPException(404, "Meeting not found")
    return Path(MEETINGS_DIR) / meeting_id


@router.put("/meeting/{meeting_id}/recording/chunks/{sequence}")
async def save_recording_chunk(meeting_id: str, sequence: int,
                               file: UploadFile = File(...), db: Session = Depends(get_db)):
    directory = recording_directory(meeting_id, db)
    if not 0 <= sequence < 100000:
        raise HTTPException(422, "Invalid chunk sequence")
    if (directory / "recording.webm").exists():
        raise HTTPException(409, "Recording already finalized")
    data = await file.read(MAX_CHUNK + 1)
    if not data or len(data) > MAX_CHUNK:
        raise HTTPException(413, "Recording chunk is empty or too large")
    if sequence == 0 and not data.startswith(b"\x1a\x45\xdf\xa3"):
        raise HTTPException(422, "Expected a WebM recording")
    parts = directory / "recording-parts"
    parts.mkdir(parents=True, exist_ok=True)
    path = parts / f"{sequence:06d}.part"
    if path.exists():
        if path.read_bytes() != data:
            raise HTTPException(409, "Chunk sequence already contains different data")
    else:
        temporary = path.with_suffix(".tmp")
        temporary.write_bytes(data)
        os.replace(temporary, path)
    return {"sequence": sequence}


@router.post("/meeting/{meeting_id}/recording/complete")
def complete_recording(meeting_id: str, db: Session = Depends(get_db)):
    directory = recording_directory(meeting_id, db)
    target = directory / "recording.webm"
    if target.exists():
        return {"saved": True}
    parts = directory / "recording-parts"
    chunks = sorted(parts.glob("*.part"))
    if not chunks:
        raise HTTPException(404, "No recording has been received")
    if [int(path.stem) for path in chunks] != list(range(len(chunks))):
        raise HTTPException(409, "Recording is missing chunks")
    temporary = directory / "recording.webm.tmp"
    try:
        with temporary.open("wb") as output:
            for chunk in chunks:
                with chunk.open("rb") as source:
                    shutil.copyfileobj(source, output)
        os.replace(temporary, target)
    finally:
        temporary.unlink(missing_ok=True)
    shutil.rmtree(parts)
    return {"saved": True}


@router.get("/meeting/{meeting_id}/recording")
def get_recording(meeting_id: str, range: str | None = Header(default=None), db: Session = Depends(get_db)):
    path = recording_directory(meeting_id, db) / "recording.webm"
    if not path.is_file():
        raise HTTPException(404, "Recording is not available yet")
    size = path.stat().st_size
    headers = {"Accept-Ranges": "bytes"}
    if not range:
        return FileResponse(path, media_type="video/webm", headers=headers)
    match = re.fullmatch(r"bytes=(\d*)-(\d*)", range)
    if not match or not any(match.groups()):
        raise HTTPException(416, "Invalid range", headers={"Content-Range": f"bytes */{size}"})
    first, last = match.groups()
    start = int(first) if first else max(0, size - int(last))
    end = min(int(last), size - 1) if first and last else size - 1
    if start >= size or start > end:
        raise HTTPException(416, "Range outside recording", headers={"Content-Range": f"bytes */{size}"})
    def read_range():
        with path.open("rb") as source:
            source.seek(start)
            remaining = end - start + 1
            while remaining:
                data = source.read(min(1024 * 1024, remaining))
                if not data:
                    break
                remaining -= len(data)
                yield data
    headers.update({"Content-Range": f"bytes {start}-{end}/{size}", "Content-Length": str(end - start + 1)})
    return StreamingResponse(read_range(), status_code=206, media_type="video/webm", headers=headers)
