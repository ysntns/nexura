"""User models for authentication"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class UserCreate(BaseModel):
    """Request model for user registration"""
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    full_name: str = Field(..., min_length=2, max_length=100)
    phone: Optional[str] = Field(None, pattern=r"^\+?[0-9]{10,15}$")
    language: str = Field(default="tr", pattern=r"^(tr|en)$")


class UserLogin(BaseModel):
    """Request model for user login"""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """Response model for user data"""
    id: str
    email: str
    full_name: str
    phone: Optional[str] = None
    language: str = "tr"
    is_active: bool = True
    is_verified: bool = False
    created_at: datetime
    total_messages_analyzed: int = 0
    total_spam_blocked: int = 0


class UserInDB(BaseModel):
    """Internal model for user stored in database"""
    email: str
    hashed_password: str
    full_name: str
    phone: Optional[str] = None
    language: str = "tr"
    is_active: bool = True
    is_verified: bool = False
    created_at: datetime
    updated_at: datetime
    total_messages_analyzed: int = 0
    total_spam_blocked: int = 0


class TokenResponse(BaseModel):
    """Response model for authentication tokens"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class RefreshTokenRequest(BaseModel):
    """Request model for token refresh"""
    refresh_token: str
