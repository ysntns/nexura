"""Authentication service"""
from datetime import datetime, timedelta
from typing import Optional, Tuple
from bson import ObjectId

from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.core.config import settings
from app.models.user import UserCreate, UserInDB, UserResponse


class AuthService:
    """Service for handling authentication operations"""

    def __init__(self, db):
        self.db = db
        self.collection = db["users"]

    async def register(self, user_data: UserCreate) -> Tuple[str, str, UserResponse]:
        """
        Register a new user
        Returns: (access_token, refresh_token, user)
        """
        # Check if user exists
        existing = await self.collection.find_one({"email": user_data.email})
        if existing:
            raise ValueError("Email already registered")

        # Create user document
        now = datetime.utcnow()
        user_doc = {
            "email": user_data.email,
            "hashed_password": get_password_hash(user_data.password),
            "full_name": user_data.full_name,
            "phone": user_data.phone,
            "language": user_data.language,
            "is_active": True,
            "is_verified": False,
            "created_at": now,
            "updated_at": now,
            "total_messages_analyzed": 0,
            "total_spam_blocked": 0,
        }

        # Insert user
        result = await self.collection.insert_one(user_doc)
        user_id = str(result.inserted_id)

        # Create tokens
        access_token = create_access_token({"sub": user_id})
        refresh_token = create_refresh_token({"sub": user_id})

        # Create default settings
        settings_collection = self.db["settings"]
        await settings_collection.insert_one({
            "user_id": user_id,
            "auto_block_spam": True,
            "auto_block_threshold": 0.8,
            "notifications_enabled": True,
            "language": user_data.language,
            "whitelist": [],
            "blacklist": [],
            "block_categories": ["betting", "phishing", "scam", "malware", "fraud"],
            "created_at": now,
            "updated_at": now,
        })

        user_response = UserResponse(
            id=user_id,
            email=user_data.email,
            full_name=user_data.full_name,
            phone=user_data.phone,
            language=user_data.language,
            is_active=True,
            is_verified=False,
            created_at=now,
            total_messages_analyzed=0,
            total_spam_blocked=0,
        )

        return access_token, refresh_token, user_response

    async def login(self, email: str, password: str) -> Tuple[str, str, UserResponse]:
        """
        Authenticate user and return tokens
        Returns: (access_token, refresh_token, user)
        """
        # Find user
        user_doc = await self.collection.find_one({"email": email})
        if not user_doc:
            raise ValueError("Invalid email or password")

        # Verify password
        if not verify_password(password, user_doc["hashed_password"]):
            raise ValueError("Invalid email or password")

        # Check if active
        if not user_doc.get("is_active", True):
            raise ValueError("Account is deactivated")

        user_id = str(user_doc["_id"])

        # Create tokens
        access_token = create_access_token({"sub": user_id})
        refresh_token = create_refresh_token({"sub": user_id})

        user_response = UserResponse(
            id=user_id,
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

        return access_token, refresh_token, user_response

    async def refresh_tokens(self, refresh_token: str) -> Tuple[str, str]:
        """
        Refresh access token using refresh token
        Returns: (new_access_token, new_refresh_token)
        """
        payload = decode_token(refresh_token)
        if not payload:
            raise ValueError("Invalid refresh token")

        if payload.get("type") != "refresh":
            raise ValueError("Invalid token type")

        user_id = payload.get("sub")
        if not user_id:
            raise ValueError("Invalid token payload")

        # Verify user exists and is active
        user_doc = await self.collection.find_one({"_id": ObjectId(user_id)})
        if not user_doc or not user_doc.get("is_active", True):
            raise ValueError("User not found or inactive")

        # Create new tokens
        new_access_token = create_access_token({"sub": user_id})
        new_refresh_token = create_refresh_token({"sub": user_id})

        return new_access_token, new_refresh_token

    async def get_user_by_id(self, user_id: str) -> Optional[UserResponse]:
        """Get user by ID"""
        try:
            user_doc = await self.collection.find_one({"_id": ObjectId(user_id)})
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
        except Exception:
            return None
