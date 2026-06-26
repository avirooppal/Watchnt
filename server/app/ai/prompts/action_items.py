from pydantic import BaseModel
from typing import List

SYSTEM_PROMPT: str = """You are an expert project manager. Review the meeting transcript and extract all action items.
Assign each action item to a specific person if mentioned. Otherwise, assign it to 'Unassigned'."""
VERSION: str = "1.0.0"

class ActionItem(BaseModel):
    task: str
    assignee: str
    context: str

class ActionItemsOutput(BaseModel):
    action_items: List[ActionItem]

def build_user_prompt(transcript: str, speakers: List[str]) -> str:
    """Build the user message from meeting data."""
    return f"Transcript:\n{transcript}"
