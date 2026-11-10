from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # App
    APP_NAME: str = "WEDY RH Platform"
    APP_ENV: str = "development"
    SECRET_KEY: str = "change_me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Database (Supabase PostgreSQL direct connection)
    DATABASE_URL: str = ""

    # Supabase client
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_SCHEMA: str = "rh"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/1"

    # MinIO / S3
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin123"
    MINIO_BUCKET_NAME: str = "rh-platform"
    MINIO_SECURE: bool = False

    # AI
    OPENAI_API_KEY: str = ""
    OPENAI_BASE_URL: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    ANTHROPIC_API_KEY: str = ""
    CV_AI_MODEL: str = "claude-sonnet-4-6"
    TYBOTFLOW_API_KEY: str = ""
    TYBOT_API_URL: str = "https://api.tybotflow.com/api/v1"

    # Email
    MAIL_USERNAME: str = ""
    MAIL_PASSWORD: str = ""
    MAIL_FROM: str = "noreply@tython.ma"
    MAIL_FROM_NAME: str = "WEDY RH"
    MAIL_PORT: int = 587
    MAIL_SERVER: str = "smtp.gmail.com"
    MAIL_STARTTLS: bool = True
    MAIL_SSL_TLS: bool = False

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:8080,http://localhost:5173"

    # Files
    MAX_FILE_SIZE_MB: int = 20
    UPLOAD_DIR: str = "uploads"
    # Employee files are also kept in a private Supabase Storage bucket so a redeploy (which wipes UPLOAD_DIR unless it is a
    # persistent volume) never loses them; the disk is then only a cache. Set DURABLE_STORAGE=false to turn it off.
    DURABLE_STORAGE: bool = True
    DURABLE_STORAGE_BUCKET: str = "wedy-files"

    @property
    def origins(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    @property
    def max_file_bytes(self) -> int:
        return self.MAX_FILE_SIZE_MB * 1024 * 1024

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


settings = Settings()
