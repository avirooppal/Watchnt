import hashlib
import json
import os
from pathlib import Path
from threading import RLock
from core.paths import MEETINGS_DIR

REVIEW_LOCK = RLock()

def action_key(item):
    identity = json.dumps([item.get("task", ""), item.get("owner")], ensure_ascii=False)
    return hashlib.sha256(identity.encode("utf-8")).hexdigest()

def apply_reviews(meeting_id, items):
    path = Path(MEETINGS_DIR) / meeting_id / "action-review.json"
    with REVIEW_LOCK:
        reviews = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
    return [{**item, "completed": reviews.get(action_key(item), item.get("completed", False))} for item in items]

def save_review(meeting_id, item, completed):
    path = Path(MEETINGS_DIR) / meeting_id / "action-review.json"
    with REVIEW_LOCK:
        reviews = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
        reviews[action_key(item)] = completed
        temp = path.with_suffix(".tmp")
        temp.write_text(json.dumps(reviews), encoding="utf-8")
        os.replace(temp, path)
