from pydantic import BaseModel, field_serializer

class SettingsUpdate(BaseModel):
    transcription_provider: str | None = None
    llm_provider: str | None = None
    transcription_model: str | None = None
    llm_model: str | None = None
    
    ollama_base_url: str | None = None
    openai_api_key: str | None = None
    groq_api_key: str | None = None
    gemini_api_key: str | None = None
    openrouter_api_key: str | None = None
    summary_prompt_template: str | None = None
    email_prompt_template: str | None = None

class SettingsResponse(BaseModel):
    transcription_provider: str
    llm_provider: str
    transcription_model: str
    llm_model: str
    ollama_base_url: str
    openai_api_key: str
    groq_api_key: str
    gemini_api_key: str
    openrouter_api_key: str
    summary_prompt_template: str
    email_prompt_template: str

    class Config:
        from_attributes = True

    @field_serializer('openai_api_key', 'groq_api_key', 'gemini_api_key', 'openrouter_api_key')
    @classmethod
    def mask_key(cls, v: str) -> str:
        if not v or len(v) < 8:
            return v
        return v[:4] + '*' * (len(v) - 8) + v[-4:]
