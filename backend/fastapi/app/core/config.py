"""Loads typed environment settings for the standalone FastAPI reference service.

Keep this module aligned with the active Express/React implementation when the parallel Python service is maintained.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "sqlite+aiosqlite:///./ndc_explorer.db"
    DATABASE_URL_SYNC: str = "sqlite:///./ndc_explorer.db"
    POOL_SIZE: int = 10
    MAX_OVERFLOW: int = 20
    POOL_TIMEOUT: int = 30
    STATEMENT_TIMEOUT_MS: int = 30000
    DEBUG: bool = False


settings = Settings()
