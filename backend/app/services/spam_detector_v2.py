"""Advanced AI-powered spam detection service using Emergent LLM Key"""
import json
import re
from typing import Optional, List
import logging
from emergentintegrations.llm.chat import LlmChat, UserMessage

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
    """Advanced AI-powered spam detection with multi-language support"""

    def __init__(self):
        self.llm_key = settings.EMERGENT_LLM_KEY
        self.chat = None
        if self.llm_key:
            # Initialize LLM chat with GPT-5.2
            self.chat = LlmChat(
                api_key=self.llm_key,
                session_id="spam-detection",
                system_message="""You are Nexura-cAIL, an expert spam detection AI specialized in multiple languages.

Your task is to analyze messages and determine if they are spam/scam. Focus on:
1. Illegal betting/gambling (yasadışı bahis/kumar)
2. Phishing attempts (oltalama saldırıları)
3. Financial scams (dolandırıcılık)
4. Fake lottery/prizes (sahte çekiliş)
5. Malware/suspicious links (zararlı yazılım)
6. Promotional spam (istenmeyen reklam)
7. Fraud and identity theft

Respond in JSON format only:
{
    "is_spam": boolean,
    "confidence": float (0.0-1.0),
    "category": "safe|betting|phishing|scam|malware|promotional|fraud|lottery|investment|other",
    "risk_level": "low|medium|high|critical",
    "explanation": "Brief multilingual explanation",
    "detected_patterns": ["list", "of", "patterns"],
    "recommended_action": "block|warn|allow"
}

Be very strict about scams and betting content."""
            ).with_model("openai", "gpt-5.2")

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
                    if category == "betting":
                        return SpamAnalysis(
                            is_spam=True,
                            confidence=0.95,
                            category=SpamCategory(category),
                            risk_level="high",
                            explanation=f"Yasadışı bahis/kumar içeriği tespit edildi | Illegal betting content detected ('{pattern}' pattern)",
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
                            explanation=f"Spam pattern detected: '{pattern}'",
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
        use_premium: bool = False,
    ) -> SpamAnalysis:
        """
        Analyze a message for spam using AI

        Args:
            content: Message text to analyze
            sender: Optional sender info (phone/name)
            whitelist: List of whitelisted senders/keywords
            blacklist: List of blacklisted senders/keywords
            use_premium: Use premium AI detection

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
                        explanation="Sender is whitelisted | Gönderen güvenilir listede",
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
                        explanation="Sender is blacklisted | Gönderen kara listede",
                        detected_patterns=[entry],
                        recommended_action="block",
                    )

        # Quick local check first
        local_result = self._local_pattern_check(content)
        if local_result and local_result.confidence >= 0.9:
            return local_result

        # Use AI for deeper analysis (premium or fallback)
        if self.chat and (use_premium or not local_result):
            try:
                return await self._ai_analyze(content, sender)
            except Exception as e:
                logger.error(f"AI analysis failed: {e}")
                if local_result:
                    return local_result

        # Default safe response if no AI available
        if local_result:
            return local_result

        return SpamAnalysis(
            is_spam=False,
            confidence=0.5,
            category=SpamCategory.SAFE,
            risk_level="low",
            explanation="Analysis incomplete, defaulting to safe | Analiz tamamlanamadı",
            detected_patterns=[],
            recommended_action="allow",
        )

    async def _ai_analyze(self, content: str, sender: Optional[str]) -> SpamAnalysis:
        """Use Emergent LLM (GPT-5.2) for advanced spam analysis"""
        
        user_message_text = f"Analyze this message for spam/scam:\n\n{content}"
        if sender:
            user_message_text += f"\n\nSender: {sender}"

        user_message = UserMessage(text=user_message_text)
        
        response = await self.chat.send_message(user_message)
        
        # Parse JSON response
        try:
            result = json.loads(response)
        except json.JSONDecodeError:
            # If response is not JSON, try to extract JSON
            import re
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group())
            else:
                raise ValueError("Could not parse AI response as JSON")

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
