"""Caller ID and phone number lookup endpoints"""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, status, Depends, Request
from pydantic import BaseModel, Field

from app.core.security import get_current_user_id
from app.core.database import get_database
from app.services.caller_service import CallerService
from app.services.spam_report_service import SpamReportService
from app.models.spam_report import (
    SpamReportCreate,
    SpamReportResponse,
    PhoneNumberStats,
)

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
    db = Depends(get_database),
):
    """
    Look up phone number details using Truecaller + community database.

    **Rate Limit:** 10 requests per minute per IP

    - **phone_number**: Phone number to lookup (with country code)
    - **country_code**: ISO country code (default: TR)

    Returns caller information:
    - name: Contact name
    - is_spam: Spam status (Truecaller + community data)
    - spam_score: Combined spam confidence
    - email, addresses, carrier, etc.
    """
    # Rate limit: 10 requests per minute
    limiter = request.app.state.limiter
    await limiter.check_limit(request, "10/minute")

    caller_service = CallerService()
    spam_service = SpamReportService(db)

    try:
        # Get Truecaller data
        truecaller_result = await caller_service.lookup_number(
            lookup_request.phone_number,
            lookup_request.country_code
        )

        # Get community spam data
        community_stats = await spam_service.get_phone_stats(
            lookup_request.phone_number
        )

        # Merge data - community data takes precedence for spam score
        if community_stats and community_stats.total_reports > 0:
            truecaller_result["is_spam"] = community_stats.is_spam
            truecaller_result["spam_score"] = community_stats.spam_score
            truecaller_result["community_reports"] = community_stats.total_reports

        return truecaller_result
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


@router.post("/report-spam", response_model=SpamReportResponse, status_code=status.HTTP_201_CREATED)
async def report_spam(
    request: Request,
    report: SpamReportCreate,
    user_id: str = Depends(get_current_user_id),
    db = Depends(get_database),
):
    """
    Report a phone number as spam.

    Adds the number to community spam database with category and reason.

    **Rate Limit:** 20 requests per minute per IP

    **Request Body:**
    - **phone_number**: Phone number to report
    - **category**: Spam category (telemarketing, scam, fraud, etc.)
    - **reason**: Optional description of why it's spam
    - **caller_name**: Optional caller name
    """
    # Rate limit: 20 requests per minute
    limiter = request.app.state.limiter
    await limiter.check_limit(request, "20/minute")

    spam_service = SpamReportService(db)

    try:
        # Check if user already reported this number
        already_reported = await spam_service.check_user_reported(
            report.phone_number,
            user_id
        )

        if already_reported:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You have already reported this phone number"
            )

        # Submit spam report
        report_id = await spam_service.report_spam(report, user_id)

        return SpamReportResponse(
            id=report_id,
            phone_number=report.phone_number,
            category=report.category,
            reason=report.reason,
            caller_name=report.caller_name,
            reported_by=user_id,
            created_at=datetime.utcnow(),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to report spam: {str(e)}"
        )


@router.get("/stats/{phone_number}", response_model=PhoneNumberStats)
async def get_phone_stats(
    phone_number: str,
    user_id: str = Depends(get_current_user_id),
    db = Depends(get_database),
):
    """
    Get community spam statistics for a phone number.

    Returns:
    - Total reports
    - Spam score (0-100)
    - Most common spam categories
    - First/last reported dates
    """
    spam_service = SpamReportService(db)

    try:
        stats = await spam_service.get_phone_stats(phone_number)
        return stats
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get phone stats: {str(e)}"
        )


@router.get("/top-spam", response_model=List[PhoneNumberStats])
async def get_top_spam_numbers(
    limit: int = 100,
    min_reports: int = 3,
    user_id: str = Depends(get_current_user_id),
    db = Depends(get_database),
):
    """
    Get top reported spam phone numbers.

    **Query Parameters:**
    - **limit**: Maximum number of results (default: 100)
    - **min_reports**: Minimum number of reports (default: 3)

    Returns list of most reported spam numbers with statistics.
    """
    spam_service = SpamReportService(db)

    try:
        top_spam = await spam_service.get_top_spam_numbers(limit, min_reports)
        return top_spam
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get top spam numbers: {str(e)}"
        )
