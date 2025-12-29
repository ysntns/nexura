"""MongoDB database connection and utilities"""
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from typing import Optional
import logging
from pymongo import ASCENDING, DESCENDING

from app.core.config import settings

logger = logging.getLogger(__name__)


class Database:
    """MongoDB database connection manager"""

    client: Optional[AsyncIOMotorClient] = None
    db: Optional[AsyncIOMotorDatabase] = None

    async def create_indexes(self) -> None:
        """Create database indexes for optimal query performance"""
        try:
            # Users collection indexes
            await self.db.users.create_index("email", unique=True, name="email_unique")
            await self.db.users.create_index("created_at", name="users_created_at")
            await self.db.users.create_index(
                [("is_active", ASCENDING), ("is_verified", ASCENDING)],
                name="users_status"
            )

            # Messages collection indexes
            await self.db.messages.create_index(
                [("user_id", ASCENDING), ("created_at", DESCENDING)],
                name="messages_user_created"
            )
            await self.db.messages.create_index("is_spam", name="messages_spam")
            await self.db.messages.create_index("category", name="messages_category")
            await self.db.messages.create_index(
                [("user_id", ASCENDING), ("is_spam", ASCENDING)],
                name="messages_user_spam"
            )
            await self.db.messages.create_index("sender_phone", name="messages_sender")

            # Settings collection indexes
            await self.db.settings.create_index("user_id", unique=True, name="settings_user_unique")

            # Spam reports collection indexes
            await self.db.spam_reports.create_index(
                [("phone_number", ASCENDING), ("created_at", DESCENDING)],
                name="spam_reports_phone_created"
            )
            await self.db.spam_reports.create_index("reported_by", name="spam_reports_user")
            await self.db.spam_reports.create_index("category", name="spam_reports_category")

            # Community spam collection indexes
            await self.db.community_spam.create_index(
                "phone_number",
                unique=True,
                name="community_spam_phone_unique"
            )
            await self.db.community_spam.create_index(
                [("spam_score", DESCENDING), ("total_reports", DESCENDING)],
                name="community_spam_score"
            )
            await self.db.community_spam.create_index("last_reported", name="community_spam_last_reported")

            logger.info("✅ Database indexes created successfully")
        except Exception as e:
            logger.warning(f"⚠️  Failed to create some indexes: {e}")

    async def connect(self) -> None:
        """Establish database connection and create indexes"""
        try:
            self.client = AsyncIOMotorClient(settings.MONGODB_URL)
            self.db = self.client[settings.DATABASE_NAME]
            # Verify connection
            await self.client.admin.command("ping")
            logger.info(f"Connected to MongoDB: {settings.DATABASE_NAME}")

            # Create indexes
            await self.create_indexes()
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            raise

    async def disconnect(self) -> None:
        """Close database connection"""
        if self.client:
            self.client.close()
            logger.info("Disconnected from MongoDB")

    def get_collection(self, name: str):
        """Get a collection from the database"""
        if self.db is None:
            raise RuntimeError("Database not connected")
        return self.db[name]


# Global database instance
database = Database()


async def get_database() -> AsyncIOMotorDatabase:
    """Dependency to get database instance"""
    if database.db is None:
        await database.connect()
    return database.db
