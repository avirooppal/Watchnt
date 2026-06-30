from pydantic import BaseModel
from datetime import datetime

class MeetingCreate(BaseModel):
    title: str

class MeetingResponse(BaseModel):
    id: str
    title: str
    created_at: datetime

    class Config:
        from_attributes = True
