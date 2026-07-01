from pydantic import BaseModel

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

    class Config:
        from_attributes = True
