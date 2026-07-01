from database.models import Settings
from services.providers.llm.base import LLMProvider
from services.providers.llm.ollama import OllamaProvider
from services.providers.llm.groq import GroqProvider
from services.providers.llm.openai import OpenAIProvider
from services.providers.llm.gemini import GeminiProvider
from services.providers.llm.openrouter import OpenRouterProvider

class LLMProviderFactory:
    @staticmethod
    def create(settings: Settings) -> LLMProvider:
        provider_name = (settings.llm_provider or "ollama").lower()
        model = settings.llm_model or ""

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
