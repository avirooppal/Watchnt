from pydantic import BaseModel
from typing import List

SYSTEM_PROMPT: str = """You are a meeting intelligence synthesizer. You will be provided with a summary, action items, and decisions from a meeting.
Your job is to synthesize these into a coherent final meeting context record, removing any contradictory or duplicative items."""
VERSION: str = "1.0.0"

class MeetingContext(BaseModel):
    title: str
    overview: str
    tags: List[str]

def build_user_prompt(summary: str, action_items: str, decisions: str) -> str:
    """Build the user message from previous outputs."""
    return f"Summary:\n{summary}\n\nAction Items:\n{action_items}\n\nDecisions:\n{decisions}"
