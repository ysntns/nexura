"""Caller ID service using Truecaller API"""
import os
from typing import List, Optional, Dict, Any
from truecallerpy import search_phonenumber
import asyncio
from functools import lru_cache


class CallerService:
    """Service for phone number lookup and caller identification"""

    def __init__(self):
        """Initialize Truecaller service with installation ID from environment"""
        self.installation_id = os.getenv("TRUECALLER_INSTALLATION_ID")
        if not self.installation_id:
            raise ValueError(
                "TRUECALLER_INSTALLATION_ID not found in environment variables. "
                "Run 'truecallerpy -i' to get your installation ID."
            )

    async def lookup_number(
        self,
        phone_number: str,
        country_code: str = "TR"
    ) -> Dict[str, Any]:
        """
        Look up a single phone number using Truecaller.

        Args:
            phone_number: Phone number to lookup
            country_code: ISO country code (default: TR)

        Returns:
            Dict with caller information
        """
        try:
            # Run in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                search_phonenumber,
                phone_number,
                country_code,
                self.installation_id
            )

            # Parse Truecaller response
            if response and "data" in response:
                data = response["data"][0] if response["data"] else {}
                return {
                    "phone_number": phone_number,
                    "name": data.get("name"),
                    "email": data.get("internetAddresses", [{}])[0].get("id") if data.get("internetAddresses") else None,
                    "addresses": data.get("addresses", []),
                    "is_spam": data.get("spamInfo", {}).get("spamType") == "SPAM",
                    "spam_score": data.get("spamInfo", {}).get("spamScore", 0),
                    "carrier": data.get("phones", [{}])[0].get("carrier") if data.get("phones") else None,
                    "country": data.get("phones", [{}])[0].get("countryCode") if data.get("phones") else None,
                }
            else:
                return {
                    "phone_number": phone_number,
                    "name": None,
                    "is_spam": False,
                    "spam_score": 0,
                }

        except Exception as e:
            print(f"Error looking up phone number {phone_number}: {str(e)}")
            return {
                "phone_number": phone_number,
                "name": None,
                "is_spam": False,
                "spam_score": 0,
                "error": str(e)
            }

    async def bulk_lookup(
        self,
        phone_numbers: List[str],
        country_code: str = "TR"
    ) -> List[Dict[str, Any]]:
        """
        Look up multiple phone numbers concurrently.

        Args:
            phone_numbers: List of phone numbers (max 30)
            country_code: ISO country code

        Returns:
            List of caller information dicts
        """
        if len(phone_numbers) > 30:
            raise ValueError("Maximum 30 phone numbers allowed per request")

        # Look up all numbers concurrently
        tasks = [
            self.lookup_number(phone, country_code)
            for phone in phone_numbers
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Filter out exceptions
        return [
            result for result in results
            if not isinstance(result, Exception)
        ]

    async def report_spam(self, phone_number: str, user_id: str) -> bool:
        """
        Report a phone number as spam.

        This would integrate with your community database.

        Args:
            phone_number: Phone number to report
            user_id: User reporting the spam

        Returns:
            bool: Success status
        """
        # TODO: Implement community spam reporting
        # Add to your MongoDB database
        print(f"User {user_id} reported {phone_number} as spam")
        return True

    @lru_cache(maxsize=1000)
    def _cached_lookup(self, phone_number: str, country_code: str) -> Dict[str, Any]:
        """
        Cached phone number lookup to reduce API calls.

        Cache expires based on LRU policy (maxsize=1000)
        """
        return search_phonenumber(phone_number, country_code, self.installation_id)
