"""Pydantic models for request/response validation"""
from app.models.user import (
    UserCreate,
    UserLogin,
    UserResponse,
    UserInDB,
    TokenResponse,
    RefreshTokenRequest,
)
from app.models.message import (
    MessageCreate,
    MessageResponse,
    MessageInDB,
    SpamAnalysis,
    SpamCategory,
    BulkAnalysisRequest,
    BulkAnalysisResponse,
)
from app.models.settings import (
    UserSettings,
    WhitelistEntry,
    BlacklistEntry,
    SettingsUpdate,
)

__all__ = [
    "UserCreate",
    "UserLogin",
    "UserResponse",
    "UserInDB",
    "TokenResponse",
    "RefreshTokenRequest",
    "MessageCreate",
    "MessageResponse",
    "MessageInDB",
    "SpamAnalysis",
    "SpamCategory",
    "BulkAnalysisRequest",
    "BulkAnalysisResponse",
    "UserSettings",
    "WhitelistEntry",
    "BlacklistEntry",
    "SettingsUpdate",
]
