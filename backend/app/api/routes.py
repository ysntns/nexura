"""API router aggregation"""
from fastapi import APIRouter

from app.api.endpoints import auth, messages, users, caller_id, subscription, payments

api_router = APIRouter(prefix="/api/v1")

# Include all endpoint routers
api_router.include_router(auth.router)
api_router.include_router(messages.router)
api_router.include_router(users.router)
api_router.include_router(caller_id.router)
api_router.include_router(subscription.router)
api_router.include_router(payments.router)
