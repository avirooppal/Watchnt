from database.models import Settings
from services.providers.llm.base import LLMProvider
from services.providers.llm.ollama import OllamaProvider
from services.providers.llm.groq import GroqProvider
from services.providers.llm.openai import OpenAIProvider
from services.providers.llm.gemini import GeminiProvider
from services.providers.llm.openrouter import OpenRouterProvider
from services.providers.llm.cloud import CloudProvider
from services.providers.catalog import PROVIDERS, NEW_CLOUD_PROVIDERS

class LLMProviderFactory:
    @staticmethod
    def create(settings: Settings) -> LLMProvider:
        provider_name = (settings.llm_provider or "ollama").lower()
        model = (settings.llm_model or "").strip()
        if provider_name not in PROVIDERS:
            raise ValueError("Unsupported AI provider")
        if provider_name != "ollama" and getattr(settings, "cloud_text_consent", "no") != "yes":
            raise ValueError("Cloud text extraction requires explicit consent in Settings")
        if provider_name == "ollama":
            if model.endswith((":cloud", "-cloud")):
                raise ValueError("Select Ollama Cloud and allow cloud text processing for hosted models")
            from schemas.config import SettingsUpdate
            SettingsUpdate(ollama_base_url=settings.ollama_base_url)
        if provider_name in NEW_CLOUD_PROVIDERS:
            return CloudProvider(provider_name, getattr(settings, f"{provider_name}_api_key", ""), model)

        if provider_name == "groq":
            return GroqProvider(api_key=settings.groq_api_key, model=model)
        elif provider_name == "openai":
            return OpenAIProvider(api_key=settings.openai_api_key, model=model)
        elif provider_name == "gemini":
            return GeminiProvider(api_key=settings.gemini_api_key, model=model)
        elif provider_name == "openrouter":
            return OpenRouterProvider(api_key=settings.openrouter_api_key, model=model)
        else:
            return OllamaProvider(base_url=settings.ollama_base_url, model=model)
