from pydantic import ConfigDict, BaseModel
from datetime import datetime
from typing import Optional

class FolderCreate(BaseModel):
    name: str

class FolderResponse(BaseModel):
    id: str
    name: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())
