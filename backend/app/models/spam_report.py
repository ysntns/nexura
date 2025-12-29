"""Community spam report models"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class SpamReportCategory(str, Enum):
    """Category of spam call/SMS"""
    TELEMARKETING = "telemarketing"
    SCAM = "scam"
    FRAUD = "fraud"
    ROBOCALL = "robocall"
    PHISHING = "phishing"
    HARASSMENT = "harassment"
    POLITICAL = "political"
    DEBT_COLLECTOR = "debt_collector"
    SURVEY = "survey"
    PRANK = "prank"
    OTHER = "other"


class SpamReportCreate(BaseModel):
    """Request model for creating a spam report"""
    phone_number: str = Field(..., min_length=10, max_length=20)
    category: SpamReportCategory
    reason: Optional[str] = Field(None, max_length=500)
    caller_name: Optional[str] = Field(None, max_length=100)


class SpamReportResponse(BaseModel):
    """Response model for spam report"""
    id: str
    phone_number: str
    category: SpamReportCategory
    reason: Optional[str]
    caller_name: Optional[str]
    reported_by: str  # user_id
    created_at: datetime


class SpamReportInDB(BaseModel):
    """Internal model for spam report in database"""
    phone_number: str
    category: SpamReportCategory
    reason: Optional[str]
    caller_name: Optional[str]
    reported_by: str  # user_id
    created_at: datetime


class PhoneNumberStats(BaseModel):
    """Statistics for a phone number"""
    phone_number: str
    total_reports: int
    spam_score: int = Field(..., ge=0, le=100)  # 0-100 based on reports
    categories: List[str] = []  # Most common categories
    is_spam: bool = False  # True if spam_score > threshold
    first_reported: Optional[datetime] = None
    last_reported: Optional[datetime] = None


class CommunitySpamInDB(BaseModel):
    """Aggregated spam data for a phone number in database"""
    phone_number: str
    total_reports: int
    spam_score: int  # 0-100
    categories: dict  # {category: count}
    reporter_ids: List[str]  # List of user IDs who reported
    first_reported: datetime
    last_reported: datetime
    is_verified: bool = False  # Admin verified
    caller_names: List[str] = []  # Reported caller names
