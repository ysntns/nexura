"""Payment endpoints for Stripe integration"""
from fastapi import APIRouter, HTTPException, status, Depends, Request
from fastapi.responses import JSONResponse

from app.core.database import get_database
from app.core.security import get_current_user_id, get_current_user
from app.models.payment import CheckoutRequest, PaymentTransactionResponse
from app.services.payment_service import payment_service

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.post("/checkout/session", response_model=dict)
async def create_checkout_session(
    request: Request,
    checkout_data: CheckoutRequest,
    user=Depends(get_current_user),
    db=Depends(get_database),
):
    """
    Create a Stripe checkout session for subscription purchase.
    
    Args:
    - package_id: Subscription package (premium_monthly, premium_yearly, pro_monthly, pro_yearly)
    - origin_url: Frontend origin URL for redirect
    
    Returns:
    - url: Stripe checkout URL to redirect user
    - session_id: Checkout session ID
    """
    try:
        # Get webhook URL
        base_url = str(request.base_url).rstrip('/')
        webhook_url = f"{base_url}/api/v1/payments/webhook/stripe"
        
        # Create checkout session
        session = await payment_service.create_checkout_session(
            package_id=checkout_data.package_id,
            user_id=user["id"],
            user_email=user["email"],
            origin_url=checkout_data.origin_url,
            webhook_url=webhook_url
        )
        
        return {
            "url": session.url,
            "session_id": session.session_id
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create checkout session: {str(e)}"
        )


@router.get("/checkout/status/{session_id}", response_model=dict)
async def get_checkout_status(
    request: Request,
    session_id: str,
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_database),
):
    """
    Get the status of a checkout session.
    
    Args:
    - session_id: Stripe checkout session ID
    
    Returns:
    - status: Checkout session status
    - payment_status: Payment status (paid, unpaid, etc.)
    - amount_total: Total amount
    - currency: Currency code
    """
    try:
        # Get webhook URL
        base_url = str(request.base_url).rstrip('/')
        webhook_url = f"{base_url}/api/v1/payments/webhook/stripe"
        
        # Get checkout status
        status_response = await payment_service.get_checkout_status(
            session_id=session_id,
            webhook_url=webhook_url
        )
        
        return {
            "status": status_response.status,
            "payment_status": status_response.payment_status,
            "amount_total": status_response.amount_total,
            "currency": status_response.currency,
            "metadata": status_response.metadata
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get checkout status: {str(e)}"
        )


@router.post("/webhook/stripe")
async def stripe_webhook(
    request: Request,
    db=Depends(get_database),
):
    """
    Handle Stripe webhook events.
    
    This endpoint receives payment notifications from Stripe.
    """
    try:
        # Get raw body and signature
        body = await request.body()
        signature = request.headers.get("Stripe-Signature")
        
        if not signature:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing Stripe signature"
            )
        
        # Get webhook URL
        base_url = str(request.base_url).rstrip('/')
        webhook_url = f"{base_url}/api/v1/payments/webhook/stripe"
        
        # Handle webhook
        await payment_service.handle_webhook(body, signature, webhook_url)
        
        return JSONResponse({"status": "success"})
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Webhook error: {str(e)}"
        )
