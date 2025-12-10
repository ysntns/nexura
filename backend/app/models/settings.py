"""User settings and whitelist/blacklist models"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class WhitelistEntry(BaseModel):
    """Whitelisted sender entry"""
    value: str  # Phone number or keyword
    type: str = Field(..., pattern=r"^(phone|keyword|sender)$")
    note: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class BlacklistEntry(BaseModel):
    """Blacklisted sender entry"""
    value: str  # Phone number or keyword
    type: str = Field(..., pattern=r"^(phone|keyword|sender)$")
    reason: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class UserSettings(BaseModel):
    """User settings model"""
    user_id: str
    auto_block_spam: bool = True
    auto_block_threshold: float = Field(default=0.8, ge=0.0, le=1.0)
    notifications_enabled: bool = True
    language: str = Field(default="tr", pattern=r"^(tr|en)$")
    whitelist: List[WhitelistEntry] = []
    blacklist: List[BlacklistEntry] = []
    block_categories: List[str] = [
        "betting", "phishing", "scam", "malware", "fraud"
    ]
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class SettingsUpdate(BaseModel):
    """Request model for updating settings"""
    auto_block_spam: Optional[bool] = None
    auto_block_threshold: Optional[float] = Field(None, ge=0.0, le=1.0)
    notifications_enabled: Optional[bool] = None
    language: Optional[str] = Field(None, pattern=r"^(tr|en)$")
    block_categories: Optional[List[str]] = None


class WhitelistAdd(BaseModel):
    """Request model for adding to whitelist"""
    value: str = Field(..., min_length=1, max_length=100)
    type: str = Field(..., pattern=r"^(phone|keyword|sender)$")
    note: Optional[str] = Field(None, max_length=200)


class BlacklistAdd(BaseModel):
    """Request model for adding to blacklist"""
    value: str = Field(..., min_length=1, max_length=100)
    type: str = Field(..., pattern=r"^(phone|keyword|sender)$")
    reason: Optional[str] = Field(None, max_length=200)
