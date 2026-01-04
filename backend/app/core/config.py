"""Application configuration settings for Nexura-cAIL"""
from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List
import os
import sys
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # App Info
    APP_NAME: str = "Nexura-cAIL"
    APP_VERSION: str = "2.0.0"
    DEBUG: bool = False

    # MongoDB
    MONGODB_URL: str
    DATABASE_NAME: str = "nexura_cail_db"

    # JWT Authentication
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Emergent LLM Key (Universal)
    EMERGENT_LLM_KEY: str = ""

    # Stripe Payment
    STRIPE_API_KEY: str = ""

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:8081,http://localhost:19006"

    # Premium Features
    FREE_TIER_DAILY_LIMIT: int = 10
    PREMIUM_TIER_DAILY_LIMIT: int = 1000
    PRO_TIER_DAILY_LIMIT: int = 10000

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        """Validate SECRET_KEY is strong enough"""
        if not v:
            raise ValueError("SECRET_KEY cannot be empty")
        if len(v) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters long")
        return v

    @field_validator("MONGODB_URL")
    @classmethod
    def validate_mongodb_url(cls, v: str) -> str:
        """Validate MongoDB URL"""
        if not v:
            raise ValueError("MONGODB_URL cannot be empty")
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

        # Check Emergent LLM Key
        if not self.EMERGENT_LLM_KEY:
            issues.append("⚠️  EMERGENT_LLM_KEY is not set - AI detection will be limited")

        # Check Stripe Key
        if not self.STRIPE_API_KEY:
            issues.append("⚠️  STRIPE_API_KEY is not set - Premium subscriptions will be disabled")

        # Log issues
        if issues:
            for issue in issues:
                logger.warning(issue)

    class Config:
        env_file = ".env"
        case_sensitive = True


# Initialize settings
try:
    settings = Settings()
    settings.validate_required_settings()
except Exception as e:
    logger.error(f"❌ Failed to load configuration: {e}")
    sys.exit(1)
