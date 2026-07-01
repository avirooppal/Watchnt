from database.models import Settings
from services.providers.transcription.base import TranscriptionProvider
from services.providers.transcription.local_whisper import LocalWhisperProvider
from services.providers.transcription.groq_whisper import GroqWhisperProvider
from services.providers.transcription.openai_whisper import OpenAIWhisperProvider

class TranscriptionProviderFactory:
    @staticmethod
    def create(settings: Settings) -> TranscriptionProvider:
        provider_name = (settings.transcription_provider or "local").lower()
        model = settings.transcription_model or ""

        if provider_name == "groq":
            return GroqWhisperProvider(api_key=settings.groq_api_key, model=model if model else "whisper-large-v3")
        elif provider_name == "openai":
            return OpenAIWhisperProvider(api_key=settings.openai_api_key, model=model if model else "whisper-1")
        else:
            return LocalWhisperProvider(model_size=model if model else "base")
