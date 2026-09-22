from database.models import Settings
from services.providers.transcription.local_whisper import LocalWhisperProvider

class TranscriptionProviderFactory:
    @staticmethod
    def create(settings: Settings) -> LocalWhisperProvider:
        # Privacy boundary: even legacy cloud STT settings never dispatch audio remotely.
        model = settings.transcription_model or "base"
        if model not in {"tiny", "base", "small", "medium", "large-v3"}:
            model = "base"
        language = getattr(settings, "transcription_language", "auto") or "auto"
        return LocalWhisperProvider(model, None if language == "auto" else language)
