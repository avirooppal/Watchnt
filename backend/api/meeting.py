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

@router.post("/meeting", response_model=MeetingResponse)
def create_meeting(meeting: MeetingCreate, db: Session = Depends(get_db)):
    db_meeting = Meeting(title=meeting.title)
    db.add(db_meeting)
    db.commit()
    db.refresh(db_meeting)
    return db_meeting
