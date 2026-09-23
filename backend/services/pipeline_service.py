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
            duration_minutes = int(max(seg.get('end', 0) for seg in segments) // 60)
            
        elif len(segments) > 1 and segments[0].get("timestamp") and segments[-1].get("timestamp"):
            try:
                duration_minutes = int((datetime.fromisoformat(segments[-1]["timestamp"].replace("Z", "+00:00")) - datetime.fromisoformat(segments[0]["timestamp"].replace("Z", "+00:00"))).total_seconds() // 60)
            except ValueError:
                pass
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

    async def _process_post_transcription(self, meeting_id: str, meeting_dir: str, segments: list, retry_failed: bool = False):
        if not any(segment.get("text", "").strip() for segment in segments):
            message = "No speech was captured. Check microphone permission and meeting audio, or enable captions before caption capture."
            os.makedirs(meeting_dir, exist_ok=True)
            with open(os.path.join(meeting_dir, "meeting.json"), "w", encoding="utf-8") as output:
                json.dump({"meeting": {"id": meeting_id}, "capture_error": message, "ai": {}}, output)
            self.update_status(meeting_id, MeetingStatus.FAILED.value)
            return

        try:
            self.update_status(meeting_id, MeetingStatus.EXTRACTING_INTELLIGENCE.value)
            
            languages = sorted({seg["language"] for seg in segments if seg.get("language")})
            self.update_meeting_metadata(meeting_id, language=", ".join(languages) or None)
            # 1. Setup the Canonical JSON Model
            full_text = "\n".join([f"[{seg.get('start', seg.get('timestamp', 'unknown time'))}] [{seg.get('speaker', 'Unknown')}]: {seg['text']}" for seg in segments])
            
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
            
            meeting_json_path = os.path.join(meeting_dir, "meeting.json")
            if retry_failed and os.path.exists(meeting_json_path):
                with open(meeting_json_path, encoding="utf-8") as source:
                    previous = json.load(source)
                for key, block in previous.get("ai", {}).items():
                    if key in meeting_json["ai"] and block.get("status") == "completed":
                        meeting_json["ai"][key] = block
                meeting_json["meeting"]["title"] = previous.get("meeting", {}).get("title", "Generated Meeting")

            def persist():
                with open(meeting_json_path + ".tmp", "w", encoding="utf-8") as output:
                    json.dump(meeting_json, output, indent=2)
                os.replace(meeting_json_path + ".tmp", meeting_json_path)

            persist()

            def log_processing(stage: str, start: float, end: float):
                meeting_json["processing"].append({
                    "stage": stage,
                    "started_at": datetime.fromtimestamp(start).isoformat(),
                    "completed_at": datetime.fromtimestamp(end).isoformat(),
                    "duration_ms": int((end - start) * 1000)
                })

            start_stage = time.time()
            
            # 2. Extract Title (Sequential)
            title = meeting_json["meeting"]["title"] if retry_failed else await self.llm_service.generate_title(full_text)
            meeting_json["meeting"]["title"] = title
            self.update_meeting_metadata(meeting_id, title=title)
            log_processing("generate_title", start_stage, time.time())
            
            # 3. Parallel AI Extraction Tasks
            start_stage = time.time()
            
            # Use asyncio.Semaphore to limit concurrency to 2 parallel requests to avoid free-tier rate limits
            semaphore = asyncio.Semaphore(2)
            provider_error = None
            
            async def run_stage(key, method):
                nonlocal provider_error
                if meeting_json["ai"][key]["status"] == "completed":
                    return
                async with semaphore:
                    if provider_error:
                        meeting_json["ai"][key] = {"status": "failed", "error": provider_error, "metadata": {}, "data": None}
                        persist()
                        return
                    meeting_json["ai"][key]["status"] = "processing"
                    persist()
                    try:
                        result = await method(full_text)
                    except Exception as error:
                        result = {"status": "failed", "error": str(error).strip() or "AI request timed out. Retry processing or choose another model in Settings.", "metadata": {}, "data": None}
                    meeting_json["ai"][key] = result
                    message = result.get("error", "") or ""
                    if result.get("status") == "failed" and any(term in message.lower() for term in (
                        "timed out", "connection", "api error 401", "api error 402", "api error 403", "api error 404", "api error 429", "api error 502", "api error 503"
                    )):
                        provider_error = message
                    persist()

            stages = {
                "summary": self.llm_service.generate_summary,
                "executive_brief": self.llm_service.generate_executive_brief,
                "actions": self.llm_service.extract_actions,
                "decisions": self.llm_service.extract_decisions,
                "email": self.llm_service.generate_email,
                "timeline": self.llm_service.generate_timeline,
                "entities": self.llm_service.extract_entities,
                "search_index": self.llm_service.generate_search_index,
            }
            await asyncio.gather(*(run_stage(key, method) for key, method in stages.items()))

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
            with open(meeting_json_path + ".tmp", "w", encoding="utf-8") as f:
                json.dump(meeting_json, f, indent=2)

            os.replace(meeting_json_path + ".tmp", meeting_json_path)
            has_failures = any(block["status"] == "failed" for block in meeting_json["ai"].values())
            self.update_status(meeting_id, MeetingStatus.FAILED.value if has_failures else MeetingStatus.COMPLETED.value)
            
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

    async def process_transcript(self, meeting_id: str, retry_failed: bool = False):
        meeting_dir = os.path.join(MEETINGS_DIR, meeting_id)
        transcript_path = os.path.join(meeting_dir, "transcript.json")
        
        if not os.path.exists(transcript_path):
            self.update_status(meeting_id, MeetingStatus.FAILED.value)
            return

        try:
            with open(transcript_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                segments = data.get("segments", [])
                
            await self._process_post_transcription(meeting_id, meeting_dir, segments, retry_failed=retry_failed)

        except Exception as e:
            logger.error(f"Error processing transcript for {meeting_id}: {e}", exc_info=True)
            self.update_status(meeting_id, MeetingStatus.FAILED.value)
