import asyncio
import os
from services.whisper_service import WhisperService
from services.llm_service import LLMService

class RecordingService:
    def __init__(self):
        self.whisper_service = WhisperService()
        self.llm_service = LLMService()

    async def process_meeting(self, meeting_id: str, base_dir: str):
        print(f"Starting background processing for meeting: {meeting_id}")
        meeting_dir = os.path.join(base_dir, "meetings", meeting_id)
        audio_path = os.path.join(meeting_dir, "audio.webm")
        
        if not os.path.exists(audio_path):
            print(f"Audio file not found for meeting: {meeting_id}")
            return
            
        try:
            # 1. Transcribe
            print(f"Transcribing meeting {meeting_id}...")
            # transcribe is synchronous in our WhisperService
            segments = await asyncio.to_thread(self.whisper_service.transcribe, audio_path)
            
            import json
            transcript_path = os.path.join(meeting_dir, "transcript.json")
            with open(transcript_path, "w", encoding="utf-8") as f:
                json.dump({"segments": segments}, f, indent=2)
                
            if not segments:
                print("Transcript is empty, skipping LLM.")
                return
                
            # 2. Summarize & Actions in parallel
            print(f"Generating summary and actions for meeting {meeting_id}...")
            summary_task = self.llm_service.summarize_meeting(segments)
            actions_task = self.llm_service.extract_action_items(segments)
            
            summary_text, actions_json_str = await asyncio.gather(summary_task, actions_task)
            
            # Save summary
            summary_path = os.path.join(meeting_dir, "summary.md")
            with open(summary_path, "w", encoding="utf-8") as f:
                f.write(summary_text)
                
            # Save actions
            actions_path = os.path.join(meeting_dir, "actions.json")
            with open(actions_path, "w", encoding="utf-8") as f:
                f.write(actions_json_str)
                
            print(f"Processing complete for meeting: {meeting_id}")
            
        except Exception as e:
            print(f"Error processing meeting {meeting_id}: {e}")
