"""Message and spam analysis models"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class SpamCategory(str, Enum):
    """Spam category enumeration"""
    SAFE = "safe"
    BETTING = "betting"  # Illegal betting/gambling
    PHISHING = "phishing"  # Credential theft attempts
    SCAM = "scam"  # Financial scams
    MALWARE = "malware"  # Malicious links
    PROMOTIONAL = "promotional"  # Unwanted ads
    FRAUD = "fraud"  # Identity fraud
    LOTTERY = "lottery"  # Fake lottery/prize
    INVESTMENT = "investment"  # Fake investment schemes
    OTHER = "other"  # Other spam types


class SpamAnalysis(BaseModel):
    """AI analysis result for a message"""
    is_spam: bool
    confidence: float = Field(..., ge=0.0, le=1.0)
    category: SpamCategory
    risk_level: str = Field(..., pattern=r"^(low|medium|high|critical)$")
    explanation: str
    detected_patterns: List[str] = []
    recommended_action: str  # block, warn, allow


class MessageCreate(BaseModel):
    """Request model for analyzing a message"""
    content: str = Field(..., min_length=1, max_length=5000)
    sender: Optional[str] = None
    sender_phone: Optional[str] = None
    source: str = Field(default="manual", pattern=r"^(sms|manual|api)$")


class MessageResponse(BaseModel):
    """Response model for analyzed message"""
    id: str
    content: str
    sender: Optional[str] = None
    sender_phone: Optional[str] = None
    source: str
    analysis: SpamAnalysis
    is_blocked: bool = False
    created_at: datetime
    user_feedback: Optional[str] = None  # correct, incorrect, unsure


class MessageInDB(BaseModel):
    """Internal model for message stored in database"""
    user_id: str
    content: str
    sender: Optional[str] = None
    sender_phone: Optional[str] = None
    source: str
    analysis: SpamAnalysis
    is_blocked: bool = False
    created_at: datetime
    user_feedback: Optional[str] = None


class BulkAnalysisRequest(BaseModel):
    """Request model for bulk message analysis"""
    messages: List[MessageCreate] = Field(..., min_length=1, max_length=50)


class BulkAnalysisResponse(BaseModel):
    """Response model for bulk analysis"""
    total: int
    spam_count: int
    safe_count: int
    results: List[MessageResponse]


class MessageFeedback(BaseModel):
    """Request model for user feedback on analysis"""
    feedback: str = Field(..., pattern=r"^(correct|incorrect|unsure)$")


class MessageStats(BaseModel):
    """Statistics for user's messages"""
    total_analyzed: int
    total_spam: int
    total_safe: int
    spam_by_category: dict
    blocked_count: int
    accuracy_feedback: dict
