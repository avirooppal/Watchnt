import asyncio
import os
import json
import time
from datetime import datetime
from services.transcription_service import TranscriptionService
from services.llm_service import LLMService
from database.db import SessionLocal
from database.models import Meeting
from schemas.status import MeetingStatus

from core.paths import MEETINGS_DIR

from core.logging import get_logger
logger = get_logger(__name__)

class PipelineService:
    def __init__(self):
        self.transcription_service = TranscriptionService()
        self.llm_service = LLMService()

    def update_status(self, meeting_id: str, status: str):
        for attempt in range(5):
            db = SessionLocal()
            try:
                meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
                if meeting:
                    meeting.status = status
                    db.commit()
                break
            except Exception as e:
                logger.warning(f"Database locked or error in update_status, retrying {attempt+1}/5: {e}")
                time.sleep(1)
            finally:
                db.close()
            
    def update_meeting_metadata(self, meeting_id: str, **kwargs):
        for attempt in range(5):
            db = SessionLocal()
            try:
                meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
                if meeting:
                    for key, value in kwargs.items():
                        setattr(meeting, key, value)
                    db.commit()
                break
            except Exception as e:
                logger.warning(f"Database locked or error in update_meeting_metadata, retrying {attempt+1}/5: {e}")
                time.sleep(1)
            finally:
                db.close()

    def _calculate_analytics(self, segments: list) -> dict:
        word_count = sum(len(seg.get('text', '').split()) for seg in segments)
        speakers = set(seg.get('speaker', 'Unknown') for seg in segments if 'speaker' in seg)
        questions = sum(seg.get('text', '').count('?') for seg in segments)
        
        # Calculate duration based on last segment end time if available
        duration_minutes = 0
        if segments and 'end' in segments[-1]:
            duration_minutes = int(segments[-1]['end'] // 60)
            
        return {
            "words": word_count,
            "speakers": len(speakers),
            "questions": questions,
            "duration_minutes": duration_minutes,
            # AI metrics will be filled when we merge the AI blocks
            "decisions": 0,
            "action_items": 0,
            "risks": 0,
            "followups": 0
        }

    async def _process_post_transcription(self, meeting_id: str, meeting_dir: str, segments: list):
        if not segments:
            self.update_status(meeting_id, MeetingStatus.COMPLETED.value)
            return

        try:
            self.update_status(meeting_id, MeetingStatus.EXTRACTING_INTELLIGENCE.value)
            
            # 1. Setup the Canonical JSON Model
            full_text = "\n".join([f"[{seg.get('speaker', 'All')}]: {seg['text']}" for seg in segments])
            
            meeting_json = {
                "schema_version": "1.0.0",
                "meeting": {
                    "id": meeting_id,
                    "title": "Generated Meeting",
                    "created_at": datetime.utcnow().isoformat()
                },
                "analytics": self._calculate_analytics(segments),
                "processing": [],
                "ai": {
                    "summary": {"status": "pending", "metadata": {}, "data": {}},
                    "executive_brief": {"status": "pending", "metadata": {}, "data": {}},
                    "actions": {"status": "pending", "metadata": {}, "data": []},
                    "decisions": {"status": "pending", "metadata": {}, "data": []},
                    "email": {"status": "pending", "metadata": {}, "data": {}},
                    "search_index": {"status": "pending", "metadata": {}, "data": []},
                    "timeline": {"status": "pending", "metadata": {}, "data": []},
                    "entities": {"status": "pending", "metadata": {}, "data": {}}
                }
            }
            
            def log_processing(stage: str, start: float, end: float):
                meeting_json["processing"].append({
                    "stage": stage,
                    "started_at": datetime.fromtimestamp(start).isoformat(),
                    "completed_at": datetime.fromtimestamp(end).isoformat(),
                    "duration_ms": int((end - start) * 1000)
                })

            start_stage = time.time()
            
            # 2. Extract Title (Sequential)
            title = await self.llm_service.generate_title(full_text)
            meeting_json["meeting"]["title"] = title
            self.update_meeting_metadata(meeting_id, title=title)
            log_processing("generate_title", start_stage, time.time())
            
            # 3. Parallel AI Extraction Tasks
            start_stage = time.time()
            
            # Use asyncio.Semaphore to limit concurrency to 2 parallel requests to avoid free-tier rate limits
            semaphore = asyncio.Semaphore(2)
            
            async def run_with_sem(coro):
                async with semaphore:
                    return await coro

            tasks = [
                run_with_sem(self.llm_service.generate_summary(full_text)),
                run_with_sem(self.llm_service.generate_executive_brief(full_text)),
                run_with_sem(self.llm_service.extract_actions(full_text)),
                run_with_sem(self.llm_service.extract_decisions(full_text)),
                run_with_sem(self.llm_service.generate_email(full_text)),
                run_with_sem(self.llm_service.generate_timeline(full_text)),
                run_with_sem(self.llm_service.extract_entities(full_text)),
                run_with_sem(self.llm_service.generate_search_index(full_text))
            ]
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            def handle_result(result, key: str):
                if isinstance(result, Exception):
                    logger.error(f"Task {key} failed unexpectedly: {result}", exc_info=True)
                    meeting_json["ai"][key] = {
                        "status": "failed",
                        "error": str(result),
                        "metadata": {},
                        "data": None
                    }
                else:
                    meeting_json["ai"][key] = result
                    
            handle_result(results[0], "summary")
            handle_result(results[1], "executive_brief")
            handle_result(results[2], "actions")
            handle_result(results[3], "decisions")
            handle_result(results[4], "email")
            handle_result(results[5], "timeline")
            handle_result(results[6], "entities")
            handle_result(results[7], "search_index")
            
            log_processing("extract_intelligence", start_stage, time.time())
            
            # Update analytics with AI results if successful
            if meeting_json["ai"]["actions"]["status"] == "completed":
                meeting_json["analytics"]["action_items"] = len(meeting_json["ai"]["actions"]["data"])
            if meeting_json["ai"]["decisions"]["status"] == "completed":
                meeting_json["analytics"]["decisions"] = len(meeting_json["ai"]["decisions"]["data"])
            if meeting_json["ai"]["summary"]["status"] == "completed":
                summary_data = meeting_json["ai"]["summary"].get("data", {})
                meeting_json["analytics"]["risks"] = len(summary_data.get("risks", []))
                meeting_json["analytics"]["followups"] = len(summary_data.get("next_steps", []))
                
            # Update DB Metadata based on first successful AI artifact if any
            for key, val in meeting_json["ai"].items():
                if val["status"] == "completed":
                    meta = val.get("metadata", {})
                    self.update_meeting_metadata(
                        meeting_id,
                        duration_minutes=str(meeting_json["analytics"]["duration_minutes"]),
                        provider=meta.get("provider"),
                        model_used=meta.get("model"),
                        model_version=meta.get("prompt_version"),
                        word_count=str(meeting_json["analytics"]["words"]),
                        speaker_count=str(meeting_json["analytics"]["speakers"])
                    )
                    break

            # 4. Persist Canonical Model
            self.update_status(meeting_id, MeetingStatus.PERSISTING_MODEL.value)
            meeting_json_path = os.path.join(meeting_dir, "meeting.json")
            with open(meeting_json_path, "w", encoding="utf-8") as f:
                json.dump(meeting_json, f, indent=2)

            self.update_status(meeting_id, MeetingStatus.COMPLETED.value)
            
        except Exception as e:
            logger.error(f"Error in post-transcription for {meeting_id}: {e}", exc_info=True)
            self.update_status(meeting_id, MeetingStatus.FAILED.value)

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
            segments = await asyncio.to_thread(self.transcription_service.transcribe, audio_path)
            
            transcript_path = os.path.join(meeting_dir, "transcript.json")
            with open(transcript_path, "w", encoding="utf-8") as f:
                json.dump({"segments": segments}, f, indent=2)
                
            await self._process_post_transcription(meeting_id, meeting_dir, segments)

        except Exception as e:
            logger.error(f"Error processing meeting {meeting_id}: {e}", exc_info=True)
            self.update_status(meeting_id, MeetingStatus.FAILED.value)

    async def process_transcript(self, meeting_id: str):
        meeting_dir = os.path.join(MEETINGS_DIR, meeting_id)
        transcript_path = os.path.join(meeting_dir, "transcript.json")
        
        if not os.path.exists(transcript_path):
            self.update_status(meeting_id, MeetingStatus.FAILED.value)
            return

        try:
            with open(transcript_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                segments = data.get("segments", [])
                
            await self._process_post_transcription(meeting_id, meeting_dir, segments)

        except Exception as e:
            logger.error(f"Error processing transcript for {meeting_id}: {e}", exc_info=True)
            self.update_status(meeting_id, MeetingStatus.FAILED.value)
