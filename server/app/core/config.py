from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/watchnt"
    redis_url: str = "redis://localhost:6379/0"
    secret_key: str = "change_me_in_production"
    api_prefix: str = "/api/v1"
    
    # Optional integrations
    hf_token: str | None = None

    class Config:
        env_file = ".env"

settings = Settings()
