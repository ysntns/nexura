"""Tests for user endpoints"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_profile(authenticated_client: AsyncClient):
    """Test getting user profile"""
    response = await authenticated_client.get("/api/v1/users/me")

    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert "email" in data
    assert "full_name" in data
    assert "created_at" in data


@pytest.mark.asyncio
async def test_update_profile(authenticated_client: AsyncClient):
    """Test updating user profile"""
    response = await authenticated_client.patch(
        "/api/v1/users/me",
        json={
            "full_name": "Updated Name",
            "phone": "+905551234567",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["full_name"] == "Updated Name"
    assert data["phone"] == "+905551234567"


@pytest.mark.asyncio
async def test_update_language(authenticated_client: AsyncClient):
    """Test updating language preference"""
    response = await authenticated_client.patch(
        "/api/v1/users/me",
        json={"language": "tr"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["language"] == "tr"


@pytest.mark.asyncio
async def test_get_settings(authenticated_client: AsyncClient):
    """Test getting user settings"""
    response = await authenticated_client.get("/api/v1/users/me/settings")

    assert response.status_code == 200
    data = response.json()
    assert "auto_block_spam" in data
    assert "auto_block_threshold" in data
    assert "notifications_enabled" in data
    assert "whitelist" in data
    assert "blacklist" in data


@pytest.mark.asyncio
async def test_update_settings(authenticated_client: AsyncClient):
    """Test updating user settings"""
    response = await authenticated_client.patch(
        "/api/v1/users/me/settings",
        json={
            "auto_block_spam": True,
            "auto_block_threshold": 0.9,
            "notifications_enabled": False,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["auto_block_spam"] == True
    assert data["auto_block_threshold"] == 0.9
    assert data["notifications_enabled"] == False


@pytest.mark.asyncio
async def test_add_to_whitelist(authenticated_client: AsyncClient):
    """Test adding to whitelist"""
    response = await authenticated_client.post(
        "/api/v1/users/me/whitelist",
        json={
            "value": "+905551234567",
            "type": "phone",
            "note": "My bank",
        },
    )

    assert response.status_code == 200


@pytest.mark.asyncio
async def test_add_to_blacklist(authenticated_client: AsyncClient):
    """Test adding to blacklist"""
    response = await authenticated_client.post(
        "/api/v1/users/me/blacklist",
        json={
            "value": "+901234567890",
            "type": "phone",
            "reason": "Spam sender",
        },
    )

    assert response.status_code == 200


@pytest.mark.asyncio
async def test_remove_from_whitelist(authenticated_client: AsyncClient):
    """Test removing from whitelist"""
    # First add
    await authenticated_client.post(
        "/api/v1/users/me/whitelist",
        json={"value": "remove_test", "type": "keyword"},
    )

    # Then remove
    response = await authenticated_client.delete(
        "/api/v1/users/me/whitelist/remove_test"
    )

    assert response.status_code == 200


@pytest.mark.asyncio
async def test_change_password(authenticated_client: AsyncClient, test_db):
    """Test password change"""
    # First create a fresh user for this test
    await test_db["users"].delete_one({"email": "pwchange@example.com"})

    # Register new user
    register_response = await authenticated_client.post(
        "/api/v1/auth/register",
        json={
            "email": "pwchange@example.com",
            "password": "oldpassword123",
            "full_name": "Password Test",
        },
    )

    # Get new token for this user
    token = register_response.json()["access_token"]
    authenticated_client.headers["Authorization"] = f"Bearer {token}"

    # Change password
    response = await authenticated_client.post(
        "/api/v1/users/me/change-password",
        json={
            "current_password": "oldpassword123",
            "new_password": "newpassword456",
        },
    )

    assert response.status_code == 200


@pytest.mark.asyncio
async def test_change_password_wrong_current(authenticated_client: AsyncClient):
    """Test password change with wrong current password"""
    response = await authenticated_client.post(
        "/api/v1/users/me/change-password",
        json={
            "current_password": "wrongpassword",
            "new_password": "newpassword456",
        },
    )

    assert response.status_code == 400
