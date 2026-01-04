"""Payment service for Stripe integration"""
import logging
from typing import Optional
from datetime import datetime
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest

from app.core.config import settings
from app.core.database import database
from app.models.payment import PaymentTransaction, PaymentStatus
from app.models.subscription import SubscriptionTier, SUBSCRIPTION_PLANS

logger = logging.getLogger(__name__)

# Payment packages
PAYMENT_PACKAGES = {
    "premium_monthly": {
        "tier": SubscriptionTier.PREMIUM,
        "amount": 9.99,
        "currency": "usd",
        "billing_cycle": "monthly",
        "description": "Premium Monthly Subscription"
    },
    "premium_yearly": {
        "tier": SubscriptionTier.PREMIUM,
        "amount": 99.99,
        "currency": "usd",
        "billing_cycle": "yearly",
        "description": "Premium Yearly Subscription (Save 16%)"
    },
    "pro_monthly": {
        "tier": SubscriptionTier.PRO,
        "amount": 19.99,
        "currency": "usd",
        "billing_cycle": "monthly",
        "description": "Professional Monthly Subscription"
    },
    "pro_yearly": {
        "tier": SubscriptionTier.PRO,
        "amount": 199.99,
        "currency": "usd",
        "billing_cycle": "yearly",
        "description": "Professional Yearly Subscription (Save 16%)"
    }
}


class PaymentService:
    """Service for handling Stripe payments"""

    def __init__(self):
        self.stripe_key = settings.STRIPE_API_KEY
        self.stripe_checkout = None

    def _initialize_stripe(self, webhook_url: str):
        """Initialize Stripe checkout with webhook URL"""
        if not self.stripe_checkout:
            self.stripe_checkout = StripeCheckout(
                api_key=self.stripe_key,
                webhook_url=webhook_url
            )

    async def create_checkout_session(
        self,
        package_id: str,
        user_id: str,
        user_email: str,
        origin_url: str,
        webhook_url: str
    ) -> CheckoutSessionResponse:
        """
        Create a Stripe checkout session
        
        Args:
            package_id: Package identifier (premium_monthly, premium_yearly, etc.)
            user_id: User ID
            user_email: User email
            origin_url: Frontend origin URL
            webhook_url: Webhook URL for payment notifications
            
        Returns:
            CheckoutSessionResponse with session URL and ID
        """
        # Validate package
        if package_id not in PAYMENT_PACKAGES:
            raise ValueError(f"Invalid package_id: {package_id}")

        # Initialize Stripe
        self._initialize_stripe(webhook_url)

        package = PAYMENT_PACKAGES[package_id]
        amount = package["amount"]
        currency = package["currency"]
        
        # Create success and cancel URLs
        success_url = f"{origin_url}/payment-success?session_id={{{{CHECKOUT_SESSION_ID}}}}"
        cancel_url = f"{origin_url}/subscription"

        # Create checkout session request
        checkout_request = CheckoutSessionRequest(
            amount=amount,
            currency=currency,
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "user_id": user_id,
                "user_email": user_email,
                "package_id": package_id,
                "tier": package["tier"],
                "billing_cycle": package["billing_cycle"]
            }
        )

        # Create checkout session
        session = await self.stripe_checkout.create_checkout_session(checkout_request)

        # Store transaction in database
        await self._create_payment_transaction(
            user_id=user_id,
            session_id=session.session_id,
            amount=amount,
            currency=currency,
            metadata=checkout_request.metadata
        )

        return session

    async def _create_payment_transaction(
        self,
        user_id: str,
        session_id: str,
        amount: float,
        currency: str,
        metadata: dict
    ):
        """Create a payment transaction record in database"""
        transaction = {
            "user_id": user_id,
            "session_id": session_id,
            "amount": amount,
            "currency": currency,
            "payment_status": PaymentStatus.INITIATED.value,
            "status": "initiated",
            "metadata": metadata,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        await database.db["payment_transactions"].insert_one(transaction)
        logger.info(f"Payment transaction created for session: {session_id}")

    async def get_checkout_status(
        self,
        session_id: str,
        webhook_url: str
    ) -> CheckoutStatusResponse:
        """
        Get the status of a checkout session
        
        Args:
            session_id: Stripe checkout session ID
            webhook_url: Webhook URL
            
        Returns:
            CheckoutStatusResponse with payment status
        """
        # Initialize Stripe
        self._initialize_stripe(webhook_url)

        # Get status from Stripe
        status = await self.stripe_checkout.get_checkout_status(session_id)

        # Update transaction in database
        await self._update_payment_transaction(session_id, status)

        return status

    async def _update_payment_transaction(
        self,
        session_id: str,
        status: CheckoutStatusResponse
    ):
        """Update payment transaction status in database"""
        # Map Stripe payment status to our PaymentStatus
        payment_status_map = {
            "paid": PaymentStatus.COMPLETED,
            "unpaid": PaymentStatus.PENDING,
            "no_payment_required": PaymentStatus.COMPLETED,
        }
        
        payment_status = payment_status_map.get(
            status.payment_status,
            PaymentStatus.PENDING
        )

        # Check if already processed to avoid duplicate upgrades
        existing = await database.db["payment_transactions"].find_one({
            "session_id": session_id,
            "payment_status": PaymentStatus.COMPLETED.value
        })

        if existing:
            logger.info(f"Payment already processed for session: {session_id}")
            return

        # Update transaction
        await database.db["payment_transactions"].update_one(
            {"session_id": session_id},
            {
                "$set": {
                    "payment_status": payment_status.value,
                    "status": status.status,
                    "updated_at": datetime.utcnow()
                }
            }
        )

        # If payment completed, upgrade user subscription
        if payment_status == PaymentStatus.COMPLETED:
            transaction = await database.db["payment_transactions"].find_one({"session_id": session_id})
            if transaction:
                await self._upgrade_user_subscription(transaction)

    async def _upgrade_user_subscription(self, transaction: dict):
        """Upgrade user subscription after successful payment"""
        user_id = transaction["user_id"]
        metadata = transaction["metadata"]
        tier = metadata.get("tier")
        billing_cycle = metadata.get("billing_cycle")

        # Calculate end date based on billing cycle
        from datetime import timedelta
        start_date = datetime.utcnow()
        if billing_cycle == "monthly":
            end_date = start_date + timedelta(days=30)
        else:  # yearly
            end_date = start_date + timedelta(days=365)

        # Update or create subscription
        await database.db["subscriptions"].update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "tier": tier,
                    "status": "active",
                    "start_date": start_date,
                    "end_date": end_date,
                    "auto_renew": True,
                    "updated_at": datetime.utcnow()
                }
            },
            upsert=True
        )

        logger.info(f"User {user_id} upgraded to {tier} subscription")

    async def handle_webhook(self, webhook_body: bytes, signature: str, webhook_url: str):
        """Handle Stripe webhook events"""
        self._initialize_stripe(webhook_url)
        
        webhook_response = await self.stripe_checkout.handle_webhook(webhook_body, signature)
        
        logger.info(f"Webhook event received: {webhook_response.event_type}")
        
        # Update transaction based on webhook event
        if webhook_response.session_id:
            status = CheckoutStatusResponse(
                status=webhook_response.event_type,
                payment_status=webhook_response.payment_status,
                amount_total=0,
                currency="usd",
                metadata=webhook_response.metadata or {}
            )
            await self._update_payment_transaction(webhook_response.session_id, status)


# Global instance
payment_service = PaymentService()
