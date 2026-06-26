from pydantic import BaseModel
from typing import List

SYSTEM_PROMPT: str = """You are a strategic advisor. Review the meeting transcript and extract all decisions that were finalized.
Include the context of the decision and who made it."""
VERSION: str = "1.0.0"

class Decision(BaseModel):
    decision: str
    context: str
    deciders: List[str]

class DecisionsOutput(BaseModel):
    decisions: List[Decision]

def build_user_prompt(transcript: str, speakers: List[str]) -> str:
    """Build the user message from meeting data."""
    return f"Transcript:\n{transcript}"
