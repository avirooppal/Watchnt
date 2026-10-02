from pydantic import ConfigDict, BaseModel, Field
from datetime import datetime
from typing import Optional, Literal

class MeetingCreate(BaseModel):
    title: str

class MeetingResponse(BaseModel):
    id: str
    title: str
    status: str
    job_id: Optional[str] = None
    created_at: datetime
    folder_id: Optional[str] = None
    duration_minutes: Optional[str] = None
    language: Optional[str] = None
    provider: Optional[str] = None
    model_used: Optional[str] = None
    model_version: Optional[str] = None
    processing_time: Optional[str] = None
    word_count: Optional[str] = None
    speaker_count: Optional[str] = None

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())

class MeetingUpdate(BaseModel):
    title: Optional[str] = None
    folder_id: Optional[str] = None

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: list[ChatMessage]

class AnalysisRequest(BaseModel):
    outputs: list[Literal["executive_brief", "summary", "actions", "decisions", "timeline", "entities", "email", "transcript"]] = Field(min_length=1, max_length=8)
