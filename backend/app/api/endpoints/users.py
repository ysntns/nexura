"""User profile and settings endpoints"""
from typing import Optional
from fastapi import APIRouter, HTTPException, status, Depends, Body
from pydantic import BaseModel, Field

from app.core.database import get_database
from app.core.security import get_current_user_id
from app.models.user import UserResponse
from app.models.settings import UserSettings, SettingsUpdate, WhitelistAdd, BlacklistAdd
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["Users"])


class ProfileUpdate(BaseModel):
    """Request model for profile update"""
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    phone: Optional[str] = Field(None, pattern=r"^\+?[0-9]{10,15}$")
    language: Optional[str] = Field(None, pattern=r"^(tr|en)$")


class PasswordChange(BaseModel):
    """Request model for password change"""
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=100)


@router.get("/me", response_model=UserResponse)
async def get_profile(
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_database),
):
    """Get current user's profile"""
    user_service = UserService(db)
    profile = await user_service.get_profile(user_id)

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return profile


@router.patch("/me", response_model=UserResponse)
async def update_profile(
    update_data: ProfileUpdate,
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_database),
):
    """Update current user's profile"""
    user_service = UserService(db)
    profile = await user_service.update_profile(
        user_id,
        full_name=update_data.full_name,
        phone=update_data.phone,
        language=update_data.language,
    )

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return profile


@router.post("/me/change-password")
async def change_password(
    password_data: PasswordChange,
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_database),
):
    """Change user's password"""
    user_service = UserService(db)
    try:
        await user_service.change_password(
            user_id,
            password_data.current_password,
            password_data.new_password,
        )
        return {"message": "Password changed successfully"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.delete("/me")
async def delete_account(
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_database),
):
    """Delete user account and all associated data"""
    user_service = UserService(db)
    success = await user_service.delete_account(user_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete account",
        )

    return {"message": "Account deleted successfully"}


# Settings endpoints
@router.get("/me/settings", response_model=UserSettings)
async def get_settings(
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_database),
):
    """Get user's settings"""
    user_service = UserService(db)
    settings = await user_service.get_settings(user_id)

    if not settings:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Settings not found",
        )

    return settings


@router.patch("/me/settings", response_model=UserSettings)
async def update_settings(
    update_data: SettingsUpdate,
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_database),
):
    """Update user's settings"""
    user_service = UserService(db)
    settings = await user_service.update_settings(user_id, update_data)

    if not settings:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Settings not found",
        )

    return settings


# Whitelist endpoints
@router.post("/me/whitelist")
async def add_whitelist(
    entry: WhitelistAdd,
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_database),
):
    """Add sender/keyword to whitelist"""
    user_service = UserService(db)
    success = await user_service.add_to_whitelist(
        user_id, entry.value, entry.type, entry.note
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to add to whitelist",
        )

    return {"message": "Added to whitelist successfully"}


@router.delete("/me/whitelist/{value}")
async def remove_whitelist(
    value: str,
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_database),
):
    """Remove entry from whitelist"""
    user_service = UserService(db)
    success = await user_service.remove_from_whitelist(user_id, value)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entry not found in whitelist",
        )

    return {"message": "Removed from whitelist successfully"}


# Blacklist endpoints
@router.post("/me/blacklist")
async def add_blacklist(
    entry: BlacklistAdd,
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_database),
):
    """Add sender/keyword to blacklist"""
    user_service = UserService(db)
    success = await user_service.add_to_blacklist(
        user_id, entry.value, entry.type, entry.reason
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to add to blacklist",
        )

    return {"message": "Added to blacklist successfully"}


@router.delete("/me/blacklist/{value}")
async def remove_blacklist(
    value: str,
    user_id: str = Depends(get_current_user_id),
    db=Depends(get_database),
):
    """Remove entry from blacklist"""
    user_service = UserService(db)
    success = await user_service.remove_from_blacklist(user_id, value)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entry not found in blacklist",
        )

    return {"message": "Removed from blacklist successfully"}
