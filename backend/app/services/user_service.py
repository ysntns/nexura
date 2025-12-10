"""User and settings management service"""
from datetime import datetime
from typing import Optional, List
from bson import ObjectId

from app.models.user import UserResponse
from app.models.settings import (
    UserSettings,
    SettingsUpdate,
    WhitelistEntry,
    BlacklistEntry,
)
from app.core.security import get_password_hash, verify_password


class UserService:
    """Service for user profile and settings management"""

    def __init__(self, db):
        self.db = db
        self.users = db["users"]
        self.settings = db["settings"]

    async def get_profile(self, user_id: str) -> Optional[UserResponse]:
        """Get user profile"""
        user_doc = await self.users.find_one({"_id": ObjectId(user_id)})
        if not user_doc:
            return None

        return UserResponse(
            id=str(user_doc["_id"]),
            email=user_doc["email"],
            full_name=user_doc["full_name"],
            phone=user_doc.get("phone"),
            language=user_doc.get("language", "tr"),
            is_active=user_doc.get("is_active", True),
            is_verified=user_doc.get("is_verified", False),
            created_at=user_doc["created_at"],
            total_messages_analyzed=user_doc.get("total_messages_analyzed", 0),
            total_spam_blocked=user_doc.get("total_spam_blocked", 0),
        )

    async def update_profile(
        self,
        user_id: str,
        full_name: Optional[str] = None,
        phone: Optional[str] = None,
        language: Optional[str] = None,
    ) -> Optional[UserResponse]:
        """Update user profile"""
        update_fields = {"updated_at": datetime.utcnow()}

        if full_name:
            update_fields["full_name"] = full_name
        if phone:
            update_fields["phone"] = phone
        if language:
            update_fields["language"] = language

        result = await self.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_fields},
        )

        if result.modified_count == 0:
            return None

        return await self.get_profile(user_id)

    async def change_password(
        self,
        user_id: str,
        current_password: str,
        new_password: str,
    ) -> bool:
        """Change user password"""
        user_doc = await self.users.find_one({"_id": ObjectId(user_id)})
        if not user_doc:
            return False

        # Verify current password
        if not verify_password(current_password, user_doc["hashed_password"]):
            raise ValueError("Current password is incorrect")

        # Update password
        result = await self.users.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": {
                    "hashed_password": get_password_hash(new_password),
                    "updated_at": datetime.utcnow(),
                }
            },
        )

        return result.modified_count > 0

    async def get_settings(self, user_id: str) -> Optional[UserSettings]:
        """Get user settings"""
        settings_doc = await self.settings.find_one({"user_id": user_id})
        if not settings_doc:
            return None

        return UserSettings(
            user_id=user_id,
            auto_block_spam=settings_doc.get("auto_block_spam", True),
            auto_block_threshold=settings_doc.get("auto_block_threshold", 0.8),
            notifications_enabled=settings_doc.get("notifications_enabled", True),
            language=settings_doc.get("language", "tr"),
            whitelist=[
                WhitelistEntry(**entry)
                for entry in settings_doc.get("whitelist", [])
            ],
            blacklist=[
                BlacklistEntry(**entry)
                for entry in settings_doc.get("blacklist", [])
            ],
            block_categories=settings_doc.get("block_categories", []),
            created_at=settings_doc.get("created_at", datetime.utcnow()),
            updated_at=settings_doc.get("updated_at", datetime.utcnow()),
        )

    async def update_settings(
        self,
        user_id: str,
        update_data: SettingsUpdate,
    ) -> Optional[UserSettings]:
        """Update user settings"""
        update_fields = {"updated_at": datetime.utcnow()}

        if update_data.auto_block_spam is not None:
            update_fields["auto_block_spam"] = update_data.auto_block_spam
        if update_data.auto_block_threshold is not None:
            update_fields["auto_block_threshold"] = update_data.auto_block_threshold
        if update_data.notifications_enabled is not None:
            update_fields["notifications_enabled"] = update_data.notifications_enabled
        if update_data.language is not None:
            update_fields["language"] = update_data.language
        if update_data.block_categories is not None:
            update_fields["block_categories"] = update_data.block_categories

        result = await self.settings.update_one(
            {"user_id": user_id},
            {"$set": update_fields},
        )

        return await self.get_settings(user_id)

    async def add_to_whitelist(
        self,
        user_id: str,
        value: str,
        entry_type: str,
        note: Optional[str] = None,
    ) -> bool:
        """Add entry to whitelist"""
        entry = {
            "value": value,
            "type": entry_type,
            "note": note,
            "created_at": datetime.utcnow(),
        }

        result = await self.settings.update_one(
            {"user_id": user_id},
            {"$push": {"whitelist": entry}, "$set": {"updated_at": datetime.utcnow()}},
        )

        return result.modified_count > 0

    async def remove_from_whitelist(self, user_id: str, value: str) -> bool:
        """Remove entry from whitelist"""
        result = await self.settings.update_one(
            {"user_id": user_id},
            {
                "$pull": {"whitelist": {"value": value}},
                "$set": {"updated_at": datetime.utcnow()},
            },
        )
        return result.modified_count > 0

    async def add_to_blacklist(
        self,
        user_id: str,
        value: str,
        entry_type: str,
        reason: Optional[str] = None,
    ) -> bool:
        """Add entry to blacklist"""
        entry = {
            "value": value,
            "type": entry_type,
            "reason": reason,
            "created_at": datetime.utcnow(),
        }

        result = await self.settings.update_one(
            {"user_id": user_id},
            {"$push": {"blacklist": entry}, "$set": {"updated_at": datetime.utcnow()}},
        )

        return result.modified_count > 0

    async def remove_from_blacklist(self, user_id: str, value: str) -> bool:
        """Remove entry from blacklist"""
        result = await self.settings.update_one(
            {"user_id": user_id},
            {
                "$pull": {"blacklist": {"value": value}},
                "$set": {"updated_at": datetime.utcnow()},
            },
        )
        return result.modified_count > 0

    async def delete_account(self, user_id: str) -> bool:
        """Delete user account and all data"""
        # Delete messages
        await self.db["messages"].delete_many({"user_id": user_id})

        # Delete settings
        await self.settings.delete_one({"user_id": user_id})

        # Delete user
        result = await self.users.delete_one({"_id": ObjectId(user_id)})

        return result.deleted_count > 0
