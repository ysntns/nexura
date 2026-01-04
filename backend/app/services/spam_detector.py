"""AI-powered spam detection service using OpenAI GPT-4o-mini"""
import json
import re
from typing import Optional, List
import logging
from openai import AsyncOpenAI

from app.core.config import settings
from app.models.message import SpamAnalysis, SpamCategory

logger = logging.getLogger(__name__)


# Turkish spam patterns for local detection
TURKISH_SPAM_PATTERNS = {
    "betting": [
        r"bahis", r"iddaa", r"casino", r"slot", r"rulet",
        r"canlı\s*bahis", r"yüksek\s*oran", r"bedava\s*bonus",
        r"free\s*bet", r"kumar", r"jackpot", r"spin",
    ],
    "phishing": [
        r"şifre.*güncelle", r"hesab.*doğrula", r"acil.*giriş",
        r"banka.*bilgi", r"kredi\s*kart", r"cvv", r"3d\s*secure",
        r"tıkla.*kazan", r"link.*tıkla",
    ],
    "scam": [
        r"para\s*kazan", r"hemen\s*kazan", r"garantili\s*gelir",
        r"yatırım.*getiri", r"kripto.*fırsat", r"bitcoin.*kazan",
        r"zengin\s*ol", r"pasif\s*gelir",
    ],
    "lottery": [
        r"çekiliş.*kazan", r"piyango", r"şanslı\s*numara",
        r"ödül.*kazan", r"hediye.*kazan", r"milyon.*kazan",
    ],
    "promotional": [
        r"kampanya", r"indirim", r"%\d+\s*off", r"fırsat",
        r"son\s*gün", r"acele\s*et", r"kaçırma",
    ],
}

# English spam patterns
ENGLISH_SPAM_PATTERNS = {
    "betting": [
        r"betting", r"casino", r"poker", r"slots", r"gambling",
        r"free\s*spins", r"bonus\s*code", r"jackpot",
    ],
    "phishing": [
        r"verify\s*account", r"update\s*password", r"confirm\s*identity",
        r"suspended\s*account", r"click\s*here\s*now", r"urgent\s*action",
    ],
    "scam": [
        r"make\s*money", r"earn\s*from\s*home", r"guaranteed\s*income",
        r"crypto\s*opportunity", r"investment\s*return", r"get\s*rich",
    ],
    "lottery": [
        r"you\s*won", r"prize\s*winner", r"lottery\s*winner",
        r"claim\s*your\s*prize", r"lucky\s*number",
    ],
}


class SpamDetector:
    """AI-powered spam detection with Turkish language support"""

    def __init__(self):
        self.client = None
        self.llm_key = settings.EMERGENT_LLM_KEY
        # Keep backward compatibility but prefer Emergent LLM
        if self.llm_key:
            # Use emergent LLM through spam_detector_v2
            pass
        elif hasattr(settings, 'OPENAI_API_KEY') and settings.OPENAI_API_KEY:
            from openai import AsyncOpenAI
            self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    def _local_pattern_check(self, content: str) -> Optional[SpamAnalysis]:
        """
        Quick local pattern matching for obvious spam
        Returns analysis if spam detected, None otherwise
        """
        content_lower = content.lower()

        # Check Turkish patterns
        for category, patterns in TURKISH_SPAM_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, content_lower, re.IGNORECASE):
                    # Strong match for betting/gambling
                    if category == "betting":
                        return SpamAnalysis(
                            is_spam=True,
                            confidence=0.95,
                            category=SpamCategory(category),
                            risk_level="high",
                            explanation=f"Yasadışı bahis/kumar içeriği tespit edildi ('{pattern}' kalıbı)",
                            detected_patterns=[pattern],
                            recommended_action="block",
                        )

        # Check English patterns
        for category, patterns in ENGLISH_SPAM_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, content_lower, re.IGNORECASE):
                    if category in ["betting", "phishing", "scam"]:
                        return SpamAnalysis(
                            is_spam=True,
                            confidence=0.90,
                            category=SpamCategory(category),
                            risk_level="high",
                            explanation=f"Spam pattern detected ('{pattern}')",
                            detected_patterns=[pattern],
                            recommended_action="block",
                        )

        return None

    async def analyze(
        self,
        content: str,
        sender: Optional[str] = None,
        whitelist: List[str] = None,
        blacklist: List[str] = None,
    ) -> SpamAnalysis:
        """
        Analyze a message for spam using AI

        Args:
            content: Message text to analyze
            sender: Optional sender info (phone/name)
            whitelist: List of whitelisted senders/keywords
            blacklist: List of blacklisted senders/keywords

        Returns:
            SpamAnalysis with detection results
        """
        whitelist = whitelist or []
        blacklist = blacklist or []

        # Check whitelist first
        if sender:
            for entry in whitelist:
                if entry.lower() in sender.lower():
                    return SpamAnalysis(
                        is_spam=False,
                        confidence=1.0,
                        category=SpamCategory.SAFE,
                        risk_level="low",
                        explanation="Gönderen güvenilir listesinde / Sender is whitelisted",
                        detected_patterns=[],
                        recommended_action="allow",
                    )

        # Check blacklist
        if sender:
            for entry in blacklist:
                if entry.lower() in sender.lower():
                    return SpamAnalysis(
                        is_spam=True,
                        confidence=1.0,
                        category=SpamCategory.OTHER,
                        risk_level="high",
                        explanation="Gönderen kara listede / Sender is blacklisted",
                        detected_patterns=[entry],
                        recommended_action="block",
                    )

        # Quick local check first
        local_result = self._local_pattern_check(content)
        if local_result and local_result.confidence >= 0.9:
            return local_result

        # Use AI for deeper analysis
        if self.client:
            try:
                return await self._ai_analyze(content, sender)
            except Exception as e:
                logger.error(f"AI analysis failed: {e}")
                # Fall back to local result or safe default
                if local_result:
                    return local_result

        # Default safe response if no AI available
        return SpamAnalysis(
            is_spam=False,
            confidence=0.5,
            category=SpamCategory.SAFE,
            risk_level="low",
            explanation="Analiz tamamlanamadı, varsayılan güvenli / Analysis incomplete, defaulting to safe",
            detected_patterns=[],
            recommended_action="allow",
        )

    async def _ai_analyze(self, content: str, sender: Optional[str]) -> SpamAnalysis:
        """Use OpenAI GPT-4o-mini for spam analysis"""

        system_prompt = """You are NEXURA-AI, an expert spam detection system specialized in Turkish and English messages.

Analyze the given message and determine if it's spam. Focus on:
1. Illegal betting/gambling (yasadışı bahis/kumar) - Very common in Turkey
2. Phishing attempts (oltalama saldırıları)
3. Financial scams (dolandırıcılık)
4. Fake lottery/prizes (sahte çekiliş)
5. Malware/suspicious links (zararlı yazılım)
6. Promotional spam (istenmeyen reklam)

Respond in JSON format only:
{
    "is_spam": boolean,
    "confidence": float (0.0-1.0),
    "category": "safe|betting|phishing|scam|malware|promotional|fraud|lottery|investment|other",
    "risk_level": "low|medium|high|critical",
    "explanation": "Brief explanation in Turkish and English",
    "detected_patterns": ["list", "of", "patterns"],
    "recommended_action": "block|warn|allow"
}

Be strict about betting/gambling content - it's illegal in Turkey and very common spam."""

        user_message = f"Analyze this message:\n\n{content}"
        if sender:
            user_message += f"\n\nSender: {sender}"

        response = await self.client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            temperature=0.1,
            max_tokens=500,
            response_format={"type": "json_object"},
        )

        result = json.loads(response.choices[0].message.content)

        return SpamAnalysis(
            is_spam=result.get("is_spam", False),
            confidence=min(max(result.get("confidence", 0.5), 0.0), 1.0),
            category=SpamCategory(result.get("category", "safe")),
            risk_level=result.get("risk_level", "low"),
            explanation=result.get("explanation", ""),
            detected_patterns=result.get("detected_patterns", []),
            recommended_action=result.get("recommended_action", "allow"),
        )


# Global instance
spam_detector = SpamDetector()
