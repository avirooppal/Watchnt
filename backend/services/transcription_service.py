import os
import subprocess
from database.db import SessionLocal
from database.models import Settings
from services.providers.transcription_factory import TranscriptionProviderFactory
from typing import List, Dict

class TranscriptionService:
    def __init__(self):
        pass

    def _get_settings(self) -> Settings:
        db = SessionLocal()
        try:
            settings = db.query(Settings).filter(Settings.id == "default").first()
            if not settings:
                settings = Settings(id="default")
            return settings
        finally:
            db.close()

    def _get_channel_count(self, audio_path: str) -> int:
        try:
            cmd = ["ffprobe", "-i", audio_path, "-show_entries", "stream=channels", "-select_streams", "a:0", "-of", "compact=p=0:nk=1", "-v", "0"]
            output = subprocess.check_output(cmd).decode().strip()
            return int(output)
        except Exception as e:
            print(f"Failed to get channel count: {e}")
            return 1

    def _split_channels(self, audio_path: str, left_path: str, right_path: str):
        cmd = [
            "ffmpeg", "-y", "-i", audio_path,
            "-filter_complex", "[0:a]channelsplit=channel_layout=stereo[left][right]",
            "-map", "[left]", left_path,
            "-map", "[right]", right_path
        ]
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    def transcribe(self, audio_path: str) -> List[Dict]:
        settings = self._get_settings()
        provider = TranscriptionProviderFactory.create(settings)
        
        channel_count = self._get_channel_count(audio_path)
        
        if channel_count == 2:
            print(f"Stereo audio detected, splitting channels for diarization...")
            base_dir = os.path.dirname(audio_path)
            left_path = os.path.join(base_dir, "left.wav")
            right_path = os.path.join(base_dir, "right.wav")
            
            try:
                self._split_channels(audio_path, left_path, right_path)
                
                print("Transcribing Left channel (Others)...")
                left_segments = provider.transcribe(left_path)
                
                print("Transcribing Right channel (Me)...")
                right_segments = provider.transcribe(right_path)
                
                for seg in left_segments:
                    seg["speaker"] = "Others"
                    
                for seg in right_segments:
                    seg["speaker"] = "Me"
                    
                combined = left_segments + right_segments
                combined.sort(key=lambda x: x["start"])
                return combined
            except Exception as e:
                print(f"Channel splitting failed, falling back to mono transcription: {e}")
                # Fall through to mono
                
        # Mono transcription (or fallback)
        segments = provider.transcribe(audio_path)
        for seg in segments:
            seg["speaker"] = "All"
        return segments
