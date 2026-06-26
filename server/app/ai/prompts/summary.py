from pydantic import BaseModel
from typing import List

SYSTEM_PROMPT: str = """You are an expert executive assistant. Your task is to summarize the following meeting transcript.
Provide an executive summary, key points discussed, and a list of high-level topics."""
VERSION: str = "1.0.0"

class SummaryOutput(BaseModel):
    executive_summary: str
    key_points: List[str]
    topics: List[str]

def build_user_prompt(transcript: str, speakers: List[str]) -> str:
    """Build the user message from meeting data."""
    speaker_list = ", ".join(speakers)
    return f"Speakers: {speaker_list}\n\nTranscript:\n{transcript}"
