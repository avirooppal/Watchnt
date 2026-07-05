import re
from fastapi import HTTPException
from database.db import SessionLocal

UUID_PATTERN = re.compile(
    r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
    re.IGNORECASE
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def validate_meeting_id(meeting_id: str) -> str:
    if not UUID_PATTERN.match(meeting_id):
        raise HTTPException(status_code=400, detail="Invalid meeting ID format")
    return meeting_id
