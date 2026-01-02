from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    # Application
    PROJECT_NAME: str = "Scheduler"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    ENVIRONMENT: str = "development"

    # Database
    DATABASE_URL: str = "postgresql://scheduler:scheduler_dev_password@localhost:5432/scheduler_dev"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Security
    SECRET_KEY: str = "dev-secret-key-change-in-production"

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000"
    ]

    # Optimization
    OPTIMIZATION_TIMEOUT_SECONDS: int = 300  # 5 minutes

    # ML
    ML_MODELS_DIR: str = "/ml-models"
    ML_TRAINING_MIN_SCHEDULES: int = 10

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
