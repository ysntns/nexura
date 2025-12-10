"""Message analysis and storage service"""
from datetime import datetime
from typing import List, Optional, Dict
from bson import ObjectId

from app.models.message import (
    MessageCreate,
    MessageResponse,
    SpamAnalysis,
    MessageStats,
    SpamCategory,
)
from app.services.spam_detector import spam_detector


class MessageService:
    """Service for handling message operations"""

    def __init__(self, db):
        self.db = db
        self.messages = db["messages"]
        self.users = db["users"]
        self.settings = db["settings"]

    async def analyze_message(
        self,
        user_id: str,
        message: MessageCreate,
    ) -> MessageResponse:
        """
        Analyze a message for spam and store the result
        """
        # Get user settings for whitelist/blacklist
        user_settings = await self.settings.find_one({"user_id": user_id})
        whitelist = []
        blacklist = []
        auto_block = True
        block_threshold = 0.8

        if user_settings:
            whitelist = [e["value"] for e in user_settings.get("whitelist", [])]
            blacklist = [e["value"] for e in user_settings.get("blacklist", [])]
            auto_block = user_settings.get("auto_block_spam", True)
            block_threshold = user_settings.get("auto_block_threshold", 0.8)

        # Analyze the message
        analysis = await spam_detector.analyze(
            content=message.content,
            sender=message.sender or message.sender_phone,
            whitelist=whitelist,
            blacklist=blacklist,
        )

        # Determine if should be blocked
        should_block = (
            auto_block and
            analysis.is_spam and
            analysis.confidence >= block_threshold
        )

        # Store the message
        now = datetime.utcnow()
        message_doc = {
            "user_id": user_id,
            "content": message.content,
            "sender": message.sender,
            "sender_phone": message.sender_phone,
            "source": message.source,
            "analysis": {
                "is_spam": analysis.is_spam,
                "confidence": analysis.confidence,
                "category": analysis.category.value,
                "risk_level": analysis.risk_level,
                "explanation": analysis.explanation,
                "detected_patterns": analysis.detected_patterns,
                "recommended_action": analysis.recommended_action,
            },
            "is_blocked": should_block,
            "created_at": now,
            "user_feedback": None,
        }

        result = await self.messages.insert_one(message_doc)

        # Update user stats
        update_fields = {"$inc": {"total_messages_analyzed": 1}}
        if analysis.is_spam:
            update_fields["$inc"]["total_spam_blocked"] = 1

        await self.users.update_one(
            {"_id": ObjectId(user_id)},
            update_fields,
        )

        return MessageResponse(
            id=str(result.inserted_id),
            content=message.content,
            sender=message.sender,
            sender_phone=message.sender_phone,
            source=message.source,
            analysis=analysis,
            is_blocked=should_block,
            created_at=now,
            user_feedback=None,
        )

    async def analyze_bulk(
        self,
        user_id: str,
        messages: List[MessageCreate],
    ) -> Dict:
        """Analyze multiple messages at once"""
        results = []
        spam_count = 0
        safe_count = 0

        for msg in messages:
            result = await self.analyze_message(user_id, msg)
            results.append(result)
            if result.analysis.is_spam:
                spam_count += 1
            else:
                safe_count += 1

        return {
            "total": len(results),
            "spam_count": spam_count,
            "safe_count": safe_count,
            "results": results,
        }

    async def get_user_messages(
        self,
        user_id: str,
        skip: int = 0,
        limit: int = 50,
        spam_only: bool = False,
    ) -> List[MessageResponse]:
        """Get user's message history"""
        query = {"user_id": user_id}
        if spam_only:
            query["analysis.is_spam"] = True

        cursor = self.messages.find(query).sort("created_at", -1).skip(skip).limit(limit)

        messages = []
        async for doc in cursor:
            analysis_data = doc["analysis"]
            analysis = SpamAnalysis(
                is_spam=analysis_data["is_spam"],
                confidence=analysis_data["confidence"],
                category=SpamCategory(analysis_data["category"]),
                risk_level=analysis_data["risk_level"],
                explanation=analysis_data["explanation"],
                detected_patterns=analysis_data.get("detected_patterns", []),
                recommended_action=analysis_data.get("recommended_action", "allow"),
            )

            messages.append(MessageResponse(
                id=str(doc["_id"]),
                content=doc["content"],
                sender=doc.get("sender"),
                sender_phone=doc.get("sender_phone"),
                source=doc["source"],
                analysis=analysis,
                is_blocked=doc.get("is_blocked", False),
                created_at=doc["created_at"],
                user_feedback=doc.get("user_feedback"),
            ))

        return messages

    async def update_feedback(
        self,
        user_id: str,
        message_id: str,
        feedback: str,
    ) -> bool:
        """Update user feedback for a message"""
        result = await self.messages.update_one(
            {"_id": ObjectId(message_id), "user_id": user_id},
            {"$set": {"user_feedback": feedback}},
        )
        return result.modified_count > 0

    async def get_stats(self, user_id: str) -> MessageStats:
        """Get user's message statistics"""
        pipeline = [
            {"$match": {"user_id": user_id}},
            {
                "$group": {
                    "_id": None,
                    "total_analyzed": {"$sum": 1},
                    "total_spam": {
                        "$sum": {"$cond": ["$analysis.is_spam", 1, 0]}
                    },
                    "total_safe": {
                        "$sum": {"$cond": ["$analysis.is_spam", 0, 1]}
                    },
                    "blocked_count": {
                        "$sum": {"$cond": ["$is_blocked", 1, 0]}
                    },
                }
            },
        ]

        result = await self.messages.aggregate(pipeline).to_list(1)

        if not result:
            return MessageStats(
                total_analyzed=0,
                total_spam=0,
                total_safe=0,
                spam_by_category={},
                blocked_count=0,
                accuracy_feedback={},
            )

        stats = result[0]

        # Get spam by category
        category_pipeline = [
            {"$match": {"user_id": user_id, "analysis.is_spam": True}},
            {"$group": {"_id": "$analysis.category", "count": {"$sum": 1}}},
        ]
        category_result = await self.messages.aggregate(category_pipeline).to_list(20)
        spam_by_category = {item["_id"]: item["count"] for item in category_result}

        # Get feedback stats
        feedback_pipeline = [
            {"$match": {"user_id": user_id, "user_feedback": {"$ne": None}}},
            {"$group": {"_id": "$user_feedback", "count": {"$sum": 1}}},
        ]
        feedback_result = await self.messages.aggregate(feedback_pipeline).to_list(10)
        accuracy_feedback = {item["_id"]: item["count"] for item in feedback_result}

        return MessageStats(
            total_analyzed=stats["total_analyzed"],
            total_spam=stats["total_spam"],
            total_safe=stats["total_safe"],
            spam_by_category=spam_by_category,
            blocked_count=stats["blocked_count"],
            accuracy_feedback=accuracy_feedback,
        )

    async def delete_message(self, user_id: str, message_id: str) -> bool:
        """Delete a message"""
        result = await self.messages.delete_one(
            {"_id": ObjectId(message_id), "user_id": user_id}
        )
        return result.deleted_count > 0
