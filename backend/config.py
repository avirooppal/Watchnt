from pydantic_settings import BaseSettings
from pydantic import ConfigDict

class Settings(BaseSettings):
    whisper_model: str = "base"
    llm_provider: str = "ollama"
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""

    model_config = ConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()

if __name__ == "__main__":
    print("Loaded Config:")
    print(f"Whisper Model: {settings.whisper_model}")
    print(f"LLM Provider: {settings.llm_provider}")
    print(f"SMTP Host: {settings.smtp_host}")
