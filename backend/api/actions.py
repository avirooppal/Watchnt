from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from threading import RLock
import os
import json
from core.paths import MEETINGS_DIR
from core.deps import get_db, validate_meeting_id
from database.models import Meeting
from services.llm_service import LLMService
from services.action_review import apply_reviews, save_review

router = APIRouter()
lock = RLock()

class ActionUpdate(BaseModel):
    completed: bool

@router.get("/action-items")
def list_actions(db: Session = Depends(get_db)):
    result = []
    for meeting in db.query(Meeting).order_by(Meeting.created_at.desc()).all():
        path = os.path.join(MEETINGS_DIR, meeting.id, "meeting.json")
        if not os.path.exists(path):
            continue
        with lock, open(path, encoding="utf-8") as file:
            data = json.load(file)
        for index, item in enumerate(apply_reviews(meeting.id, data.get("ai", {}).get("actions", {}).get("data") or [])):
            result.append({**item, "meeting_id": meeting.id, "meeting_title": meeting.title,
                           "index": index, "completed": item.get("completed", False)})
    return result

@router.patch("/meeting/{meeting_id}/action/{index}")
def update_action(meeting_id: str, index: int, update: ActionUpdate):
    meeting_id = validate_meeting_id(meeting_id)
    path = os.path.join(MEETINGS_DIR, meeting_id, "meeting.json")
    with lock:
        if not os.path.exists(path):
            raise HTTPException(404, "Meeting not found")
        with open(path, encoding="utf-8") as file:
            data = json.load(file)
        items = data.get("ai", {}).get("actions", {}).get("data") or []
        if index < 0 or index >= len(items):
            raise HTTPException(404, "Action not found")
        save_review(meeting_id, items[index], update.completed)
        items[index]["completed"] = update.completed
        with open(path + ".tmp", "w", encoding="utf-8") as file:
            json.dump(data, file, ensure_ascii=False, indent=2)
        os.replace(path + ".tmp", path)
    return items[index]

@router.post("/actions/{meeting_id}")
async def generate_actions(meeting_id: str):
    meeting_id = validate_meeting_id(meeting_id)
    path = os.path.join(MEETINGS_DIR, meeting_id, "transcript.json")
    if not os.path.exists(path):
        raise HTTPException(404, "Transcript not found")
    with open(path, encoding="utf-8") as file:
        segments = json.load(file).get("segments", [])
    return await LLMService().extract_actions("\n".join(s["text"] for s in segments))
