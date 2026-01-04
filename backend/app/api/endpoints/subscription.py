"""Subscription endpoints"""
from fastapi import APIRouter, HTTPException, status, Depends
from typing import List

from app.core.database import get_database
from app.core.security import get_current_user_id
from app.models.subscription import (
    SubscriptionResponse,
    SubscriptionPlan,
    SubscriptionTier,
    SUBSCRIPTION_PLANS,
)
from app.services.subscription_service import SubscriptionService

router = APIRouter(prefix="/subscription", tags=["Subscription"])


@router.get("/plans", response_model=List[SubscriptionPlan])
async def get_plans():
    """
    Get all available subscription plans.
    
    Returns list of subscription plans with pricing and features.
    """
    return list(SUBSCRIPTION_PLANS.values())


@router.get("/me", response_model=SubscriptionResponse)
async def get_my_subscription(
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_database),
):
    """
    Get current user's subscription details.
    
    Returns:
    - Current tier
    - Subscription status
    - Usage limits and current usage
    - Renewal information
    """
    subscription_service = SubscriptionService(db)
    return await subscription_service.get_user_subscription(user_id)


@router.get("/usage", response_model=dict)
async def get_usage(
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_database),
):
    """
    Get current usage statistics for the day.
    
    Returns:
    - Daily limit
    - Current usage
    - Remaining checks
    """
    subscription_service = SubscriptionService(db)
    usage = await subscription_service.get_daily_usage(user_id)
    return usage


@router.post("/cancel")
async def cancel_subscription(
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_database),
):
    """
    Cancel active subscription.
    
    Subscription will remain active until the end of the billing period.
    """
    subscription_service = SubscriptionService(db)
    success = await subscription_service.cancel_subscription(user_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active subscription to cancel"
        )
    
    return {"message": "Subscription cancelled successfully"}
