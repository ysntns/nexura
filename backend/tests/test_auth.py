"""Tests for authentication endpoints"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_success(client: AsyncClient, test_db):
    """Test successful user registration"""
    # Clean up any existing user
    await test_db["users"].delete_one({"email": "newuser@example.com"})

    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "newuser@example.com",
            "password": "securepassword123",
            "full_name": "New User",
            "language": "tr",
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["email"] == "newuser@example.com"
    assert data["user"]["full_name"] == "New User"
    assert data["user"]["language"] == "tr"


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient, test_db):
    """Test registration with existing email"""
    # First, ensure user exists
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "duplicate@example.com",
            "password": "password123",
            "full_name": "First User",
        },
    )

    # Try to register again
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "duplicate@example.com",
            "password": "password456",
            "full_name": "Second User",
        },
    )

    assert response.status_code == 400
    assert "already registered" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_register_invalid_email(client: AsyncClient):
    """Test registration with invalid email"""
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "notanemail",
            "password": "password123",
            "full_name": "Test User",
        },
    )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_short_password(client: AsyncClient):
    """Test registration with short password"""
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "short@example.com",
            "password": "short",
            "full_name": "Test User",
        },
    )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, test_db):
    """Test successful login"""
    # Ensure user exists
    await test_db["users"].delete_one({"email": "logintest@example.com"})
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "logintest@example.com",
            "password": "testpassword123",
            "full_name": "Login Test",
        },
    )

    response = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "logintest@example.com",
            "password": "testpassword123",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["email"] == "logintest@example.com"


@pytest.mark.asyncio
async def test_login_invalid_credentials(client: AsyncClient):
    """Test login with invalid credentials"""
    response = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "nonexistent@example.com",
            "password": "wrongpassword",
        },
    )

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_refresh_token(client: AsyncClient, test_db):
    """Test token refresh"""
    # Get tokens first
    await test_db["users"].delete_one({"email": "refresh@example.com"})
    register_response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "refresh@example.com",
            "password": "password123",
            "full_name": "Refresh Test",
        },
    )

    refresh_token = register_response.json()["refresh_token"]

    # Refresh the token
    response = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data


@pytest.mark.asyncio
async def test_refresh_invalid_token(client: AsyncClient):
    """Test refresh with invalid token"""
    response = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": "invalid_token"},
    )

    assert response.status_code == 401
