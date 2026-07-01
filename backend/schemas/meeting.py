from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class MeetingCreate(BaseModel):
    title: str

class MeetingResponse(BaseModel):
    id: str
    title: str
    status: str
    job_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
