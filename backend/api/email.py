"""Follow-up email drafts remain local; WatchNT never sends meeting data via SMTP."""
import json
from pathlib import Path
from fastapi import APIRouter, HTTPException
from core.deps import validate_meeting_id
from core.paths import MEETINGS_DIR

router = APIRouter()

@router.get("/email/{meeting_id}")
def get_email_draft(meeting_id: str):
    path = Path(MEETINGS_DIR) / validate_meeting_id(meeting_id) / "meeting.json"
    if not path.exists():
        raise HTTPException(404, "Meeting not found")
    return json.loads(path.read_text(encoding="utf-8")).get("ai", {}).get("email", {})

@router.post("/email/{meeting_id}")
def send_email(meeting_id: str):
    validate_meeting_id(meeting_id)
    raise HTTPException(410, "SMTP sending is disabled by local-first policy. Export the email draft instead.")
