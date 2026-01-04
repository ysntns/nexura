"""Subscription models for premium features"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class SubscriptionTier(str, Enum):
    """Subscription tier levels"""
    FREE = "free"
    PREMIUM = "premium"
    PRO = "pro"


class SubscriptionStatus(str, Enum):
    """Subscription status"""
    ACTIVE = "active"
    CANCELLED = "cancelled"
    EXPIRED = "expired"
    TRIAL = "trial"


class SubscriptionPlan(BaseModel):
    """Subscription plan details"""
    id: str
    name: str
    tier: SubscriptionTier
    price_monthly: float
    price_yearly: float
    features: List[str]
    daily_limit: int
    description: str


class UserSubscription(BaseModel):
    """User subscription in database"""
    user_id: str
    tier: SubscriptionTier = SubscriptionTier.FREE
    status: SubscriptionStatus = SubscriptionStatus.ACTIVE
    start_date: datetime
    end_date: Optional[datetime] = None
    stripe_subscription_id: Optional[str] = None
    stripe_customer_id: Optional[str] = None
    auto_renew: bool = True
    created_at: datetime
    updated_at: datetime


class SubscriptionResponse(BaseModel):
    """Response model for subscription data"""
    tier: SubscriptionTier
    status: SubscriptionStatus
    start_date: datetime
    end_date: Optional[datetime] = None
    daily_limit: int
    daily_usage: int
    auto_renew: bool
    features: List[str]


class SubscriptionUpgradeRequest(BaseModel):
    """Request to upgrade subscription"""
    tier: SubscriptionTier
    billing_cycle: str = Field(..., pattern=r"^(monthly|yearly)$")


# Subscription Plans
SUBSCRIPTION_PLANS = {
    SubscriptionTier.FREE: SubscriptionPlan(
        id="free",
        name="Free",
        tier=SubscriptionTier.FREE,
        price_monthly=0.0,
        price_yearly=0.0,
        features=[
            "10 spam checks per day",
            "Basic spam detection",
            "Manual message check",
            "Ad supported"
        ],
        daily_limit=10,
        description="Basic protection for casual users"
    ),
    SubscriptionTier.PREMIUM: SubscriptionPlan(
        id="premium",
        name="Premium",
        tier=SubscriptionTier.PREMIUM,
        price_monthly=9.99,
        price_yearly=99.99,
        features=[
            "1000 spam checks per day",
            "AI-powered detection",
            "Automatic SMS filtering",
            "Real-time call screening",
            "Community database",
            "Priority support",
            "No ads"
        ],
        daily_limit=1000,
        description="Premium protection for power users"
    ),
    SubscriptionTier.PRO: SubscriptionPlan(
        id="pro",
        name="Professional",
        tier=SubscriptionTier.PRO,
        price_monthly=19.99,
        price_yearly=199.99,
        features=[
            "Unlimited spam checks",
            "Advanced AI detection",
            "Automatic SMS filtering",
            "Real-time call screening",
            "Community database",
            "Number lookup unlimited",
            "Cloud backup",
            "Advanced analytics",
            "Priority support",
            "No ads"
        ],
        daily_limit=10000,
        description="Ultimate protection for businesses"
    )
}
