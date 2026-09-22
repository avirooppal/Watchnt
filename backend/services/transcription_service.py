from database.db import SessionLocal
from database.models import Settings
from services.providers.transcription_factory import TranscriptionProviderFactory

class TranscriptionService:
    def _get_settings(self):
        with SessionLocal() as db:
            return db.get(Settings, "default") or Settings(id="default")

    def transcribe(self, audio_path):
        provider = TranscriptionProviderFactory.create(self._get_settings())
        segments = provider.transcribe(audio_path)
        for segment in segments:
            segment["speaker"] = "Unknown"
        return segments
