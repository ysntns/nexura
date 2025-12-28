"""Message analysis endpoints"""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Depends, Query, Request

from app.core.database import get_database
from app.core.security import get_current_user_id
from app.models.message import (
    MessageCreate,
    MessageResponse,
    BulkAnalysisRequest,
    BulkAnalysisResponse,
    MessageFeedback,
    MessageStats,
)
from app.services.message_service import MessageService

router = APIRouter(prefix="/messages", tags=["Messages"])

# Rate limit decorator will be imported from main app
def get_limiter(request: Request):
    return request.app.state.limiter


@router.post("/analyze", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def analyze_message(
    request: Request,
    message: MessageCreate,
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_database),
):
    """
    Analyze a message for spam using AI.

    **Rate Limit:** 20 requests per minute per IP

    - **content**: Message text to analyze (max 5000 chars)
    - **sender**: Optional sender name
    - **sender_phone**: Optional sender phone number
    - **source**: Message source (sms/manual/api)

    Returns spam analysis with:
    - is_spam: Boolean indicating if spam
    - confidence: Detection confidence (0-1)
    - category: Spam category (betting, phishing, scam, etc.)
    - risk_level: low/medium/high/critical
    - explanation: Human-readable explanation (TR/EN)
    - recommended_action: block/warn/allow
    """
    # Rate limit: 20 requests per minute
    limiter = request.app.state.limiter
    await limiter.check_limit(request, "20/minute")

    message_service = MessageService(db)
    return await message_service.analyze_message(user_id, message)


@router.post("/analyze/bulk", response_model=BulkAnalysisResponse)
async def analyze_bulk(
    http_request: Request,
    request: BulkAnalysisRequest,
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_database),
):
    """
    Analyze multiple messages at once (max 50).

    **Rate Limit:** 5 requests per minute per IP

    Returns summary and individual results for all messages.
    """
    # Rate limit: 5 requests per minute (more restrictive due to bulk)
    limiter = http_request.app.state.limiter
    await limiter.check_limit(http_request, "5/minute")

    message_service = MessageService(db)
    result = await message_service.analyze_bulk(user_id, request.messages)
    return BulkAnalysisResponse(**result)


@router.get("/", response_model=List[MessageResponse])
async def get_messages(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    spam_only: bool = Query(False),
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_database),
):
    """
    Get user's message history.

    - **skip**: Number of messages to skip (pagination)
    - **limit**: Maximum messages to return (max 100)
    - **spam_only**: Filter to show only spam messages
    """
    message_service = MessageService(db)
    return await message_service.get_user_messages(user_id, skip, limit, spam_only)


@router.get("/stats", response_model=MessageStats)
async def get_stats(
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_database),
):
    """
    Get user's message statistics.

    Returns:
    - Total messages analyzed
    - Spam vs safe counts
    - Spam breakdown by category
    - Blocked message count
    - Accuracy feedback summary
    """
    message_service = MessageService(db)
    return await message_service.get_stats(user_id)


@router.get("/{message_id}", response_model=MessageResponse)
async def get_message(
    message_id: str,
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_database),
):
    """Get a specific message by ID"""
    message_service = MessageService(db)
    messages = await message_service.get_user_messages(user_id, 0, 1000)

    for msg in messages:
        if msg.id == message_id:
            return msg

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Message not found",
    )


@router.patch("/{message_id}/feedback")
async def update_feedback(
    message_id: str,
    feedback: MessageFeedback,
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_database),
):
    """
    Provide feedback on spam analysis accuracy.

    - **feedback**: correct/incorrect/unsure

    This helps improve the AI detection over time.
    """
    message_service = MessageService(db)
    success = await message_service.update_feedback(
        user_id, message_id, feedback.feedback
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found",
        )

    return {"message": "Feedback recorded successfully"}


@router.delete("/{message_id}")
async def delete_message(
    message_id: str,
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_database),
):
    """Delete a message from history"""
    message_service = MessageService(db)
    success = await message_service.delete_message(user_id, message_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found",
        )

    return {"message": "Message deleted successfully"}
