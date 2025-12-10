"""Pytest configuration and fixtures"""
import pytest
import asyncio
from typing import AsyncGenerator, Generator
from httpx import AsyncClient
from motor.motor_asyncio import AsyncIOMotorClient

from app.main import app
from app.core.database import database
from app.core.config import settings


# Test database name
TEST_DB_NAME = "nexura_test_db"


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create event loop for async tests"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
async def test_db():
    """Set up test database"""
    # Use test database
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[TEST_DB_NAME]

    # Override the database instance
    database.client = client
    database.db = db

    yield db

    # Cleanup: drop test database
    await client.drop_database(TEST_DB_NAME)
    client.close()


@pytest.fixture
async def client(test_db) -> AsyncGenerator:
    """Create async HTTP client for testing"""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac


@pytest.fixture
async def authenticated_client(client: AsyncClient, test_db) -> AsyncGenerator:
    """Create authenticated client with test user"""
    # Register a test user
    user_data = {
        "email": "test@example.com",
        "password": "testpassword123",
        "full_name": "Test User",
        "language": "en",
    }

    response = await client.post("/api/v1/auth/register", json=user_data)

    if response.status_code == 201:
        token = response.json()["access_token"]
    else:
        # User might already exist, try login
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": user_data["email"], "password": user_data["password"]},
        )
        token = response.json()["access_token"]

    client.headers["Authorization"] = f"Bearer {token}"
    yield client


@pytest.fixture
def sample_messages():
    """Sample messages for testing"""
    return [
        {
            "content": "Congratulations! You've won $1,000,000! Click here to claim your prize!",
            "sender": "+1234567890",
            "expected_spam": True,
            "expected_category": "lottery",
        },
        {
            "content": "Your appointment is confirmed for tomorrow at 2 PM.",
            "sender": "Doctor's Office",
            "expected_spam": False,
            "expected_category": "safe",
        },
        {
            "content": "Hemen bahis yap, yüksek oranlarla kazan! Bedava bonus!",
            "sender": "+905551234567",
            "expected_spam": True,
            "expected_category": "betting",
        },
        {
            "content": "Your verification code is 123456. Do not share this code.",
            "sender": "Bank",
            "expected_spam": False,
            "expected_category": "safe",
        },
        {
            "content": "URGENT: Your account has been suspended! Click here to verify your identity immediately!",
            "sender": "Unknown",
            "expected_spam": True,
            "expected_category": "phishing",
        },
    ]
