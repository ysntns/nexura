"""Payment transaction models"""
from pydantic import BaseModel, Field
from typing import Optional, Dict
from datetime import datetime
from enum import Enum


class PaymentStatus(str, Enum):
    """Payment status types"""
    PENDING = "pending"
    INITIATED = "initiated"
    COMPLETED = "completed"
    FAILED = "failed"
    EXPIRED = "expired"
    REFUNDED = "refunded"


class PaymentTransaction(BaseModel):
    """Payment transaction in database"""
    id: str
    user_id: str
    session_id: str
    amount: float
    currency: str = "usd"
    payment_status: PaymentStatus
    status: str  # Stripe checkout session status
    stripe_payment_intent_id: Optional[str] = None
    metadata: Dict[str, str] = {}
    created_at: datetime
    updated_at: datetime


class PaymentTransactionResponse(BaseModel):
    """Response model for payment transaction"""
    id: str
    session_id: str
    amount: float
    currency: str
    payment_status: PaymentStatus
    status: str
    created_at: datetime


class CheckoutRequest(BaseModel):
    """Request to create checkout session"""
    package_id: str = Field(..., description="Subscription package ID (premium_monthly, premium_yearly, pro_monthly, pro_yearly)")
    origin_url: str = Field(..., description="Frontend origin URL for redirect")
