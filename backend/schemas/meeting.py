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
    folder_id: Optional[str] = None

    class Config:
        from_attributes = True

class MeetingUpdate(BaseModel):
    title: Optional[str] = None
    folder_id: Optional[str] = None

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: list[ChatMessage]
