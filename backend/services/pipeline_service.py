import asyncio
import os
import json
from services.whisper_service import WhisperService
from services.llm_service import LLMService
from services.email_service import EmailService
from database.db import SessionLocal
from database.models import Meeting
from schemas.status import MeetingStatus

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MEETINGS_DIR = os.path.join(BASE_DIR, "meetings")

class PipelineService:
    def __init__(self):
        self.whisper_service = WhisperService()
        self.llm_service = LLMService()
        self.email_service = EmailService()

    def update_status(self, meeting_id: str, status: str):
        db = SessionLocal()
        try:
            meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
            if meeting:
                meeting.status = status
                db.commit()
        finally:
            db.close()

    async def process_meeting(self, meeting_id: str):
        meeting_dir = os.path.join(MEETINGS_DIR, meeting_id)
        audio_path = os.path.join(meeting_dir, "audio.webm")
        
        if not os.path.exists(audio_path):
            audio_path = os.path.join(meeting_dir, "audio.wav") # Fallback
            if not os.path.exists(audio_path):
                self.update_status(meeting_id, MeetingStatus.FAILED.value)
                return

        try:
            # 1. TRANSCRIBING
            self.update_status(meeting_id, MeetingStatus.TRANSCRIBING.value)
            segments = await asyncio.to_thread(self.whisper_service.transcribe, audio_path)
            
            transcript_path = os.path.join(meeting_dir, "transcript.json")
            with open(transcript_path, "w", encoding="utf-8") as f:
                json.dump({"segments": segments}, f, indent=2)
                
            if not segments:
                self.update_status(meeting_id, MeetingStatus.COMPLETED.value)
                return

            # 2. SUMMARIZING
            self.update_status(meeting_id, MeetingStatus.SUMMARIZING.value)
            summary_text = await self.llm_service.summarize_meeting(segments)
            summary_path = os.path.join(meeting_dir, "summary.md")
            with open(summary_path, "w", encoding="utf-8") as f:
                f.write(summary_text)

            # 3. EXTRACTING ACTIONS
            self.update_status(meeting_id, MeetingStatus.EXTRACTING_ACTIONS.value)
            actions_json_str = await self.llm_service.extract_action_items(segments)
            actions_path = os.path.join(meeting_dir, "actions.json")
            with open(actions_path, "w", encoding="utf-8") as f:
                f.write(actions_json_str)

            # 4. GENERATING EMAIL
            self.update_status(meeting_id, MeetingStatus.GENERATING_EMAIL.value)
            email_html = await self.llm_service.generate_email(summary_text, actions_json_str)
            email_path = os.path.join(meeting_dir, "email.html")
            with open(email_path, "w", encoding="utf-8") as f:
                f.write(email_html)

            # 5. COMPLETED
            self.update_status(meeting_id, MeetingStatus.COMPLETED.value)

        except Exception as e:
            print(f"Error processing meeting {meeting_id}: {e}")
            self.update_status(meeting_id, MeetingStatus.FAILED.value)
