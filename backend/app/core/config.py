"""Application configuration settings"""
from pydantic_settings import BaseSettings
from pydantic import field_validator, ValidationError
from typing import List
import os
import sys
import logging

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # App Info
    APP_NAME: str = "NEXURA-AI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # MongoDB
    MONGODB_URL: str
    DATABASE_NAME: str = "nexura_db"

    # JWT Authentication
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # OpenAI
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:8081,http://localhost:19006"

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        """Validate SECRET_KEY is strong enough"""
        if not v:
            raise ValueError("SECRET_KEY cannot be empty")
        if len(v) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters long")
        if v == "nexura-secret-key-change-in-production":
            raise ValueError("SECRET_KEY cannot be the default value - change it!")
        if v == "your-super-secret-key-change-in-production":
            raise ValueError("SECRET_KEY must be changed from example value")
        return v

    @field_validator("MONGODB_URL")
    @classmethod
    def validate_mongodb_url(cls, v: str) -> str:
        """Validate MongoDB URL includes authentication in production"""
        if not v:
            raise ValueError("MONGODB_URL cannot be empty")
        # In production (DEBUG=False), require authentication
        # For now just warn if no auth credentials
        if "@" not in v and "localhost" not in v:
            logger.warning("⚠️  MongoDB URL does not contain authentication credentials")
        return v

    @property
    def cors_origins(self) -> List[str]:
        """Parse CORS origins from comma-separated string"""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

    def validate_required_settings(self) -> None:
        """Validate critical settings on startup"""
        issues = []

        # Check OpenAI API key
        if not self.OPENAI_API_KEY:
            issues.append("⚠️  OPENAI_API_KEY is not set - AI spam detection will be disabled")

        # Check DEBUG in production
        if not self.DEBUG and "localhost" in self.MONGODB_URL:
            issues.append("⚠️  Running in production mode but MongoDB is localhost")

        # Log issues
        if issues:
            for issue in issues:
                logger.warning(issue)

    class Config:
        env_file = ".env"
        case_sensitive = True


# Initialize settings with error handling
try:
    settings = Settings()
    settings.validate_required_settings()
except ValidationError as e:
    logger.error("❌ Configuration validation failed:")
    for error in e.errors():
        field = error["loc"][0]
        message = error["msg"]
        logger.error(f"  - {field}: {message}")
    logger.error("\n💡 Please check your .env file and ensure all required variables are set correctly")
    logger.error("   See .env.example for reference")
    sys.exit(1)
except Exception as e:
    logger.error(f"❌ Failed to load configuration: {e}")
    sys.exit(1)
