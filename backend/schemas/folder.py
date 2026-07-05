from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class FolderCreate(BaseModel):
    name: str

class FolderResponse(BaseModel):
    id: str
    name: str
    created_at: datetime

    class Config:
        from_attributes = True
