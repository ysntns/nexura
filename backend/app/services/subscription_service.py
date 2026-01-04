"""Subscription service for managing user subscriptions"""
import logging
from datetime import datetime, timedelta
from typing import Optional

from app.core.database import database
from app.core.config import settings
from app.models.subscription import (
    SubscriptionTier,
    SubscriptionStatus,
    SubscriptionResponse,
    SUBSCRIPTION_PLANS,
)

logger = logging.getLogger(__name__)


class SubscriptionService:
    """Service for managing user subscriptions"""

    def __init__(self, db):
        self.db = db

    async def get_user_subscription(self, user_id: str) -> SubscriptionResponse:
        """
        Get user's current subscription
        
        Args:
            user_id: User ID
            
        Returns:
            SubscriptionResponse with subscription details
        """
        # Get subscription from database
        subscription = await database.db["subscriptions"].find_one({"user_id": user_id})
        
        # If no subscription, create free tier
        if not subscription:
            subscription = await self._create_free_subscription(user_id)
        
        # Get plan details
        tier = SubscriptionTier(subscription["tier"])
        plan = SUBSCRIPTION_PLANS[tier]
        
        # Get daily usage
        daily_usage = await self.get_daily_usage(user_id)
        
        return SubscriptionResponse(
            tier=tier,
            status=SubscriptionStatus(subscription["status"]),
            start_date=subscription["start_date"],
            end_date=subscription.get("end_date"),
            daily_limit=plan.daily_limit,
            daily_usage=daily_usage["used"],
            auto_renew=subscription.get("auto_renew", False),
            features=plan.features
        )

    async def _create_free_subscription(self, user_id: str) -> dict:
        """Create a free subscription for new users"""
        subscription = {
            "user_id": user_id,
            "tier": SubscriptionTier.FREE.value,
            "status": SubscriptionStatus.ACTIVE.value,
            "start_date": datetime.utcnow(),
            "end_date": None,
            "auto_renew": False,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        await database.db["subscriptions"].insert_one(subscription)
        return subscription

    async def get_daily_usage(self, user_id: str) -> dict:
        """
        Get user's daily usage count
        
        Args:
            user_id: User ID
            
        Returns:
            Dict with limit, used, and remaining counts
        """
        # Get subscription
        subscription = await database.db["subscriptions"].find_one({"user_id": user_id})
        
        if not subscription:
            subscription = await self._create_free_subscription(user_id)
        
        tier = SubscriptionTier(subscription["tier"])
        plan = SUBSCRIPTION_PLANS[tier]
        
        # Count messages analyzed today
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        
        count = await database.db["messages"].count_documents({
            "user_id": user_id,
            "created_at": {"$gte": today_start}
        })
        
        return {
            "limit": plan.daily_limit,
            "used": count,
            "remaining": max(0, plan.daily_limit - count)
        }

    async def check_usage_limit(self, user_id: str) -> bool:
        """
        Check if user has reached daily usage limit
        
        Args:
            user_id: User ID
            
        Returns:
            True if user can use service, False if limit reached
        """
        usage = await self.get_daily_usage(user_id)
        return usage["remaining"] > 0

    async def cancel_subscription(self, user_id: str) -> bool:
        """
        Cancel user's subscription
        
        Args:
            user_id: User ID
            
        Returns:
            True if cancelled, False if no active subscription
        """
        subscription = await database.db["subscriptions"].find_one({
            "user_id": user_id,
            "status": SubscriptionStatus.ACTIVE.value
        })
        
        if not subscription or subscription["tier"] == SubscriptionTier.FREE.value:
            return False
        
        # Update subscription to cancelled (remains active until end_date)
        await database.db["subscriptions"].update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "status": SubscriptionStatus.CANCELLED.value,
                    "auto_renew": False,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        logger.info(f"Subscription cancelled for user: {user_id}")
        return True

    async def is_premium_user(self, user_id: str) -> bool:
        """
        Check if user has premium or pro subscription
        
        Args:
            user_id: User ID
            
        Returns:
            True if premium/pro, False otherwise
        """
        subscription = await database.db["subscriptions"].find_one({"user_id": user_id})
        
        if not subscription:
            return False
        
        tier = SubscriptionTier(subscription["tier"])
        return tier in [SubscriptionTier.PREMIUM, SubscriptionTier.PRO]
