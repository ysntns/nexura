"""Tests for message analysis endpoints"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_analyze_message_spam(authenticated_client: AsyncClient):
    """Test analyzing a spam message"""
    response = await authenticated_client.post(
        "/api/v1/messages/analyze",
        json={
            "content": "Congratulations! You won $1,000,000! Click here NOW to claim your prize!",
            "sender": "+1234567890",
            "source": "manual",
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert "id" in data
    assert "analysis" in data
    assert data["analysis"]["is_spam"] == True
    assert data["analysis"]["confidence"] > 0.7
    assert data["analysis"]["category"] in ["lottery", "scam", "phishing"]


@pytest.mark.asyncio
async def test_analyze_message_safe(authenticated_client: AsyncClient):
    """Test analyzing a safe message"""
    response = await authenticated_client.post(
        "/api/v1/messages/analyze",
        json={
            "content": "Your appointment is confirmed for tomorrow at 2 PM. Please arrive 15 minutes early.",
            "sender": "Doctor's Office",
            "source": "manual",
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["analysis"]["is_spam"] == False
    assert data["analysis"]["category"] == "safe"


@pytest.mark.asyncio
async def test_analyze_turkish_betting_spam(authenticated_client: AsyncClient):
    """Test analyzing Turkish betting spam"""
    response = await authenticated_client.post(
        "/api/v1/messages/analyze",
        json={
            "content": "Hemen bahis yap! Yüksek oranlarla kazan! Bedava 500 TL bonus!",
            "sender": "+905551234567",
            "source": "sms",
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["analysis"]["is_spam"] == True
    assert data["analysis"]["category"] == "betting"
    assert data["analysis"]["confidence"] >= 0.9


@pytest.mark.asyncio
async def test_analyze_phishing_message(authenticated_client: AsyncClient):
    """Test analyzing phishing message"""
    response = await authenticated_client.post(
        "/api/v1/messages/analyze",
        json={
            "content": "URGENT: Your bank account has been suspended! Click here immediately to verify your identity and restore access.",
            "source": "manual",
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["analysis"]["is_spam"] == True
    assert data["analysis"]["category"] in ["phishing", "scam"]
    assert data["analysis"]["risk_level"] in ["high", "critical"]


@pytest.mark.asyncio
async def test_analyze_empty_message(authenticated_client: AsyncClient):
    """Test analyzing empty message"""
    response = await authenticated_client.post(
        "/api/v1/messages/analyze",
        json={
            "content": "",
            "source": "manual",
        },
    )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_get_message_history(authenticated_client: AsyncClient):
    """Test getting message history"""
    # First, analyze a message
    await authenticated_client.post(
        "/api/v1/messages/analyze",
        json={
            "content": "Test message for history",
            "source": "manual",
        },
    )

    # Get history
    response = await authenticated_client.get("/api/v1/messages/")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0


@pytest.mark.asyncio
async def test_get_message_stats(authenticated_client: AsyncClient):
    """Test getting message statistics"""
    response = await authenticated_client.get("/api/v1/messages/stats")

    assert response.status_code == 200
    data = response.json()
    assert "total_analyzed" in data
    assert "total_spam" in data
    assert "total_safe" in data
    assert "spam_by_category" in data


@pytest.mark.asyncio
async def test_provide_feedback(authenticated_client: AsyncClient):
    """Test providing feedback on analysis"""
    # First, analyze a message
    analyze_response = await authenticated_client.post(
        "/api/v1/messages/analyze",
        json={
            "content": "Feedback test message",
            "source": "manual",
        },
    )

    message_id = analyze_response.json()["id"]

    # Provide feedback
    response = await authenticated_client.patch(
        f"/api/v1/messages/{message_id}/feedback",
        json={"feedback": "correct"},
    )

    assert response.status_code == 200


@pytest.mark.asyncio
async def test_delete_message(authenticated_client: AsyncClient):
    """Test deleting a message"""
    # First, analyze a message
    analyze_response = await authenticated_client.post(
        "/api/v1/messages/analyze",
        json={
            "content": "Message to delete",
            "source": "manual",
        },
    )

    message_id = analyze_response.json()["id"]

    # Delete the message
    response = await authenticated_client.delete(f"/api/v1/messages/{message_id}")

    assert response.status_code == 200


@pytest.mark.asyncio
async def test_bulk_analysis(authenticated_client: AsyncClient):
    """Test bulk message analysis"""
    response = await authenticated_client.post(
        "/api/v1/messages/analyze/bulk",
        json={
            "messages": [
                {"content": "Normal message 1", "source": "manual"},
                {"content": "You won the lottery! Click here!", "source": "manual"},
                {"content": "Bahis kazan, yüksek oran!", "source": "sms"},
            ]
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 3
    assert data["spam_count"] >= 2
    assert len(data["results"]) == 3


@pytest.mark.asyncio
async def test_unauthorized_access(client: AsyncClient):
    """Test accessing protected endpoint without auth"""
    response = await client.post(
        "/api/v1/messages/analyze",
        json={"content": "Test message", "source": "manual"},
    )

    assert response.status_code == 403  # No auth header
