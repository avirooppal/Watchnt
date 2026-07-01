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

    def transcribe(self, audio_path: str) -> List[Dict]:
        settings = self._get_settings()
        provider = TranscriptionProviderFactory.create(settings)
        return provider.transcribe(audio_path)
