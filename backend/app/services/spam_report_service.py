"""Community spam reporting service"""
from datetime import datetime
from typing import Dict, Optional, List
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from app.models.spam_report import (
    SpamReportCreate,
    SpamReportInDB,
    PhoneNumberStats,
    CommunitySpamInDB,
    SpamReportCategory,
)


class SpamReportService:
    """Service for managing community spam reports"""

    def __init__(self, db: AsyncIOMotorDatabase):
        """Initialize service with database connection"""
        self.db = db
        self.spam_reports = db.spam_reports  # Individual reports
        self.community_spam = db.community_spam  # Aggregated data

    async def report_spam(
        self,
        report: SpamReportCreate,
        user_id: str
    ) -> str:
        """
        Submit a spam report for a phone number.

        Args:
            report: Spam report details
            user_id: ID of user reporting

        Returns:
            Report ID
        """
        # Create spam report document
        report_doc = SpamReportInDB(
            phone_number=report.phone_number,
            category=report.category,
            reason=report.reason,
            caller_name=report.caller_name,
            reported_by=user_id,
            created_at=datetime.utcnow(),
        ).dict()

        # Insert individual report
        result = await self.spam_reports.insert_one(report_doc)

        # Update aggregated community spam data
        await self._update_community_spam(report, user_id)

        return str(result.inserted_id)

    async def _update_community_spam(
        self,
        report: SpamReportCreate,
        user_id: str
    ) -> None:
        """
        Update aggregated spam data for a phone number.

        Args:
            report: Spam report details
            user_id: ID of user reporting
        """
        phone_number = report.phone_number
        now = datetime.utcnow()

        # Check if phone number already has spam data
        existing = await self.community_spam.find_one(
            {"phone_number": phone_number}
        )

        if existing:
            # Update existing record
            categories = existing.get("categories", {})
            category_name = report.category.value
            categories[category_name] = categories.get(category_name, 0) + 1

            reporter_ids = existing.get("reporter_ids", [])
            if user_id not in reporter_ids:
                reporter_ids.append(user_id)

            caller_names = existing.get("caller_names", [])
            if report.caller_name and report.caller_name not in caller_names:
                caller_names.append(report.caller_name)

            total_reports = existing.get("total_reports", 0) + 1
            spam_score = min(100, total_reports * 10)  # 10 points per report, max 100

            await self.community_spam.update_one(
                {"phone_number": phone_number},
                {
                    "$set": {
                        "total_reports": total_reports,
                        "spam_score": spam_score,
                        "categories": categories,
                        "reporter_ids": reporter_ids,
                        "caller_names": caller_names,
                        "last_reported": now,
                    }
                }
            )
        else:
            # Create new record
            spam_doc = CommunitySpamInDB(
                phone_number=phone_number,
                total_reports=1,
                spam_score=10,  # First report = 10 points
                categories={report.category.value: 1},
                reporter_ids=[user_id],
                first_reported=now,
                last_reported=now,
                is_verified=False,
                caller_names=[report.caller_name] if report.caller_name else [],
            ).dict()

            await self.community_spam.insert_one(spam_doc)

    async def get_phone_stats(
        self,
        phone_number: str
    ) -> Optional[PhoneNumberStats]:
        """
        Get spam statistics for a phone number.

        Args:
            phone_number: Phone number to check

        Returns:
            Phone number statistics or None if not found
        """
        spam_data = await self.community_spam.find_one(
            {"phone_number": phone_number}
        )

        if not spam_data:
            return PhoneNumberStats(
                phone_number=phone_number,
                total_reports=0,
                spam_score=0,
                categories=[],
                is_spam=False,
            )

        # Get top 3 categories sorted by count
        categories = spam_data.get("categories", {})
        top_categories = sorted(
            categories.items(),
            key=lambda x: x[1],
            reverse=True
        )[:3]

        return PhoneNumberStats(
            phone_number=phone_number,
            total_reports=spam_data.get("total_reports", 0),
            spam_score=spam_data.get("spam_score", 0),
            categories=[cat[0] for cat in top_categories],
            is_spam=spam_data.get("spam_score", 0) >= 30,  # Spam if score >= 30
            first_reported=spam_data.get("first_reported"),
            last_reported=spam_data.get("last_reported"),
        )

    async def get_user_reports(
        self,
        user_id: str,
        skip: int = 0,
        limit: int = 50
    ) -> List[Dict]:
        """
        Get spam reports submitted by a user.

        Args:
            user_id: User ID
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of spam reports
        """
        cursor = self.spam_reports.find(
            {"reported_by": user_id}
        ).sort("created_at", -1).skip(skip).limit(limit)

        reports = []
        async for report in cursor:
            report["id"] = str(report.pop("_id"))
            reports.append(report)

        return reports

    async def get_top_spam_numbers(
        self,
        limit: int = 100,
        min_reports: int = 3
    ) -> List[PhoneNumberStats]:
        """
        Get top reported spam numbers.

        Args:
            limit: Maximum number of results
            min_reports: Minimum number of reports required

        Returns:
            List of phone number statistics
        """
        cursor = self.community_spam.find(
            {"total_reports": {"$gte": min_reports}}
        ).sort("spam_score", -1).limit(limit)

        results = []
        async for spam_data in cursor:
            categories = spam_data.get("categories", {})
            top_categories = sorted(
                categories.items(),
                key=lambda x: x[1],
                reverse=True
            )[:3]

            stats = PhoneNumberStats(
                phone_number=spam_data.get("phone_number"),
                total_reports=spam_data.get("total_reports", 0),
                spam_score=spam_data.get("spam_score", 0),
                categories=[cat[0] for cat in top_categories],
                is_spam=spam_data.get("spam_score", 0) >= 30,
                first_reported=spam_data.get("first_reported"),
                last_reported=spam_data.get("last_reported"),
            )
            results.append(stats)

        return results

    async def check_user_reported(
        self,
        phone_number: str,
        user_id: str
    ) -> bool:
        """
        Check if user has already reported this phone number.

        Args:
            phone_number: Phone number to check
            user_id: User ID

        Returns:
            True if user has already reported this number
        """
        report = await self.spam_reports.find_one({
            "phone_number": phone_number,
            "reported_by": user_id
        })
        return report is not None
