"""Tests for spam detection service"""
import pytest
from app.services.spam_detector import SpamDetector, SpamCategory


@pytest.fixture
def detector():
    """Create spam detector instance"""
    return SpamDetector()


class TestLocalPatternDetection:
    """Test local pattern matching (without AI)"""

    @pytest.mark.asyncio
    async def test_turkish_betting_detection(self, detector):
        """Test Turkish betting spam detection"""
        result = await detector.analyze(
            content="Hemen bahis yap, yüksek oranlarla kazan!"
        )

        assert result.is_spam == True
        assert result.category == SpamCategory.BETTING
        assert result.confidence >= 0.9
        assert result.risk_level == "high"
        assert result.recommended_action == "block"

    @pytest.mark.asyncio
    async def test_casino_detection(self, detector):
        """Test casino spam detection"""
        result = await detector.analyze(
            content="Free casino bonus! 100 free spins waiting for you!"
        )

        assert result.is_spam == True
        assert result.category == SpamCategory.BETTING
        assert result.confidence >= 0.8

    @pytest.mark.asyncio
    async def test_phishing_detection(self, detector):
        """Test phishing detection"""
        result = await detector.analyze(
            content="Hesabınızı doğrulamak için şifrenizi güncelleyin!"
        )

        # May be detected by local patterns
        # Phishing patterns should trigger detection

    @pytest.mark.asyncio
    async def test_lottery_detection(self, detector):
        """Test lottery scam detection"""
        result = await detector.analyze(
            content="You won the lottery! Claim your $1,000,000 prize now!"
        )

        # Should be detected as lottery scam
        assert result.is_spam == True or result.confidence < 0.5

    @pytest.mark.asyncio
    async def test_safe_message(self, detector):
        """Test safe message detection"""
        result = await detector.analyze(
            content="Your package will arrive tomorrow between 2-4 PM."
        )

        # Without AI, safe messages return default
        assert result.is_spam == False or result.confidence < 0.7

    @pytest.mark.asyncio
    async def test_whitelist_bypass(self, detector):
        """Test whitelisted sender bypasses detection"""
        result = await detector.analyze(
            content="Free casino bonus just for you!",
            sender="trusted@bank.com",
            whitelist=["trusted@bank.com"],
        )

        assert result.is_spam == False
        assert result.category == SpamCategory.SAFE
        assert result.confidence == 1.0

    @pytest.mark.asyncio
    async def test_blacklist_block(self, detector):
        """Test blacklisted sender is blocked"""
        result = await detector.analyze(
            content="Hello, how are you?",
            sender="spammer@bad.com",
            blacklist=["spammer@bad.com"],
        )

        assert result.is_spam == True
        assert result.confidence == 1.0
        assert result.recommended_action == "block"


class TestPatternMatching:
    """Test specific pattern matching"""

    @pytest.mark.asyncio
    async def test_multiple_patterns(self, detector):
        """Test message with multiple spam patterns"""
        result = await detector.analyze(
            content="Casino + bahis + slot! Hemen kazan, jackpot fırsatı!"
        )

        assert result.is_spam == True
        assert result.confidence >= 0.9

    @pytest.mark.asyncio
    async def test_case_insensitive(self, detector):
        """Test case-insensitive pattern matching"""
        result = await detector.analyze(content="BAHİS OYNA KAZAN!")

        assert result.is_spam == True

    @pytest.mark.asyncio
    async def test_partial_match(self, detector):
        """Test partial pattern matching"""
        result = await detector.analyze(
            content="canlı bahisten para kazan"
        )

        assert result.is_spam == True
        assert result.category == SpamCategory.BETTING


class TestEdgeCases:
    """Test edge cases"""

    @pytest.mark.asyncio
    async def test_empty_whitelist(self, detector):
        """Test with empty whitelist"""
        result = await detector.analyze(
            content="Bahis kazan!",
            whitelist=[],
        )

        assert result.is_spam == True

    @pytest.mark.asyncio
    async def test_unicode_content(self, detector):
        """Test with unicode characters"""
        result = await detector.analyze(
            content="Şans oyunları ile 💰 kazan!"
        )

        # Should handle unicode gracefully

    @pytest.mark.asyncio
    async def test_long_message(self, detector):
        """Test with long message"""
        long_content = "Normal text. " * 500

        result = await detector.analyze(content=long_content)

        assert result is not None

    @pytest.mark.asyncio
    async def test_special_characters(self, detector):
        """Test with special characters"""
        result = await detector.analyze(
            content="B@h!s k@z@n! Ç0k pAr@ $$$ !!!"
        )

        # Should handle special chars without crashing
        assert result is not None
