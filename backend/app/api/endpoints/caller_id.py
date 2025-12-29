"""Caller ID and phone number lookup endpoints"""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Depends, Request
from pydantic import BaseModel, Field

from app.core.security import get_current_user_id
from app.services.caller_service import CallerService

router = APIRouter(prefix="/caller", tags=["Caller ID"])


class PhoneLookupRequest(BaseModel):
    """Request model for phone number lookup"""
    phone_number: str = Field(..., description="Phone number to lookup")
    country_code: str = Field(default="TR", description="Country code (e.g., TR, IN, US)")


class PhoneLookupResponse(BaseModel):
    """Response model for phone number lookup"""
    phone_number: str
    name: Optional[str] = None
    email: Optional[str] = None
    addresses: Optional[List[dict]] = None
    is_spam: bool = False
    spam_score: Optional[int] = None
    carrier: Optional[str] = None
    country: Optional[str] = None


class BulkLookupRequest(BaseModel):
    """Request model for bulk phone number lookup"""
    phone_numbers: List[str] = Field(..., max_items=30, description="List of phone numbers (max 30)")
    country_code: str = Field(default="TR", description="Country code")


@router.post("/lookup", response_model=PhoneLookupResponse)
async def lookup_phone_number(
    request: Request,
    lookup_request: PhoneLookupRequest,
    user_id: str = Depends(get_current_user_id),
):
    """
    Look up phone number details using Truecaller database.

    **Rate Limit:** 10 requests per minute per IP

    - **phone_number**: Phone number to lookup (with country code)
    - **country_code**: ISO country code (default: TR)

    Returns caller information:
    - name: Contact name
    - is_spam: Spam status
    - spam_score: Spam confidence
    - email, addresses, carrier, etc.
    """
    # Rate limit: 10 requests per minute
    limiter = request.app.state.limiter
    await limiter.check_limit(request, "10/minute")

    caller_service = CallerService()
    try:
        result = await caller_service.lookup_number(
            lookup_request.phone_number,
            lookup_request.country_code
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Phone number lookup failed: {str(e)}"
        )


@router.post("/lookup/bulk", response_model=List[PhoneLookupResponse])
async def bulk_lookup(
    request: Request,
    bulk_request: BulkLookupRequest,
    user_id: str = Depends(get_current_user_id),
):
    """
    Bulk lookup multiple phone numbers (max 30).

    **Rate Limit:** 5 requests per minute per IP
    """
    # Rate limit: 5 requests per minute
    limiter = request.app.state.limiter
    await limiter.check_limit(request, "5/minute")

    caller_service = CallerService()
    try:
        results = await caller_service.bulk_lookup(
            bulk_request.phone_numbers,
            bulk_request.country_code
        )
        return results
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Bulk lookup failed: {str(e)}"
        )


@router.post("/report-spam/{phone_number}")
async def report_spam(
    request: Request,
    phone_number: str,
    user_id: str = Depends(get_current_user_id),
):
    """
    Report a phone number as spam.

    Adds the number to community spam database.
    """
    # Rate limit: 20 requests per minute
    limiter = request.app.state.limiter
    await limiter.check_limit(request, "20/minute")

    caller_service = CallerService()
    try:
        await caller_service.report_spam(phone_number, user_id)
        return {"message": "Phone number reported as spam successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to report spam: {str(e)}"
        )
