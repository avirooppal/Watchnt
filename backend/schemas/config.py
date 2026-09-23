from pydantic import ConfigDict, BaseModel, field_serializer, field_validator
from typing import Literal
from urllib.parse import urlparse
import os
from services.providers.catalog import PROVIDERS, API_KEY_FIELDS

class SettingsUpdate(BaseModel):
    transcription_provider: Literal["local"] | None = None
    transcription_language: str | None = None
    cloud_text_consent: Literal["yes", "no"] | None = None
    llm_provider: str | None = None
    transcription_model: str | None = None
    llm_model: str | None = None
    
    ollama_base_url: str | None = None
    openai_api_key: str | None = None
    groq_api_key: str | None = None
    gemini_api_key: str | None = None
    openrouter_api_key: str | None = None
    ollama_cloud_api_key: str | None = None
    anthropic_api_key: str | None = None
    deepseek_api_key: str | None = None
    mistral_api_key: str | None = None
    together_api_key: str | None = None
    fireworks_api_key: str | None = None
    cerebras_api_key: str | None = None
    xai_api_key: str | None = None
    summary_prompt_template: str | None = None
    email_prompt_template: str | None = None

    @field_validator("llm_provider")
    @classmethod
    def provider(cls, value):
        if value is not None and value not in PROVIDERS:
            raise ValueError("Unsupported AI provider")
        return value

    @field_validator("transcription_language")
    @classmethod
    def language(cls, value):
        if value is not None and value != "auto":
            from faster_whisper.tokenizer import _LANGUAGE_CODES
            if value not in _LANGUAGE_CODES:
                raise ValueError("Unsupported Whisper language code")
        return value

    @field_validator("ollama_base_url")
    @classmethod
    def local_ollama(cls, value):
        if value is not None:
            url = urlparse(value)
            local_hosts = {"localhost", "127.0.0.1", "::1"}
            if os.environ.get("WATCHNT_ALLOW_DOCKER_HOST") == "1":
                local_hosts.add("host.docker.internal")
            if os.environ.get("WATCHNT_DOCKER") == "1":
                local_hosts.add("ollama")
            if url.scheme != "http" or url.hostname not in local_hosts or url.username or url.password:
                raise ValueError("Ollama must use a loopback HTTP endpoint")
        return value

class SettingsResponse(BaseModel):
    transcription_provider: str
    transcription_language: str = "auto"
    cloud_text_consent: str = "no"
    llm_provider: str
    transcription_model: str
    llm_model: str
    ollama_base_url: str
    openai_api_key: str
    groq_api_key: str
    gemini_api_key: str
    openrouter_api_key: str
    ollama_cloud_api_key: str = ""
    anthropic_api_key: str = ""
    deepseek_api_key: str = ""
    mistral_api_key: str = ""
    together_api_key: str = ""
    fireworks_api_key: str = ""
    cerebras_api_key: str = ""
    xai_api_key: str = ""
    summary_prompt_template: str
    email_prompt_template: str

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())

    @field_serializer(*API_KEY_FIELDS)
    @classmethod
    def mask_key(cls, v: str) -> str:
        if not v:
            return ""
        if len(v) < 12:
            return "********"
        return v[:4] + '*' * (len(v) - 8) + v[-4:]
