"""Authentication endpoints"""
from fastapi import APIRouter, HTTPException, status, Depends

from app.core.database import get_database
from app.core.config import settings
from app.models.user import (
    UserCreate,
    UserLogin,
    TokenResponse,
    RefreshTokenRequest,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db=Depends(get_database)):
    """
    Register a new user account.

    - **email**: Valid email address (unique)
    - **password**: Minimum 8 characters
    - **full_name**: User's full name
    - **phone**: Optional phone number
    - **language**: Preferred language (tr/en)
    """
    auth_service = AuthService(db)
    try:
        access_token, refresh_token, user = await auth_service.register(user_data)
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=user,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, db=Depends(get_database)):
    """
    Authenticate user and receive access tokens.

    - **email**: Registered email address
    - **password**: Account password
    """
    auth_service = AuthService(db)
    try:
        access_token, refresh_token, user = await auth_service.login(
            credentials.email, credentials.password
        )
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=user,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )


@router.post("/refresh", response_model=dict)
async def refresh_token(request: RefreshTokenRequest, db=Depends(get_database)):
    """
    Refresh access token using refresh token.

    - **refresh_token**: Valid refresh token
    """
    auth_service = AuthService(db)
    try:
        access_token, new_refresh_token = await auth_service.refresh_tokens(
            request.refresh_token
        )
        return {
            "access_token": access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )


@router.post("/logout")
async def logout():
    """
    Logout user (client should discard tokens).

    Note: JWT tokens are stateless, so logout is handled client-side.
    """
    return {"message": "Successfully logged out"}
