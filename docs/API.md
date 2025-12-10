# NEXURA-AI API Documentation

## Base URL

```
Development: http://localhost:8000/api/v1
Production: https://api.nexura.ai/api/v1
```

## Authentication

All endpoints (except `/auth/*`) require Bearer token authentication:

```
Authorization: Bearer <access_token>
```

---

## Authentication Endpoints

### Register User

```http
POST /auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "full_name": "John Doe",
  "phone": "+905551234567",
  "language": "tr"
}
```

**Response (201):**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 1800,
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "full_name": "John Doe",
    "phone": "+905551234567",
    "language": "tr",
    "is_active": true,
    "is_verified": false,
    "created_at": "2024-01-15T10:30:00Z",
    "total_messages_analyzed": 0,
    "total_spam_blocked": 0
  }
}
```

### Login

```http
POST /auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

### Refresh Token

```http
POST /auth/refresh
```

**Request Body:**
```json
{
  "refresh_token": "eyJ..."
}
```

---

## Message Endpoints

### Analyze Message

```http
POST /messages/analyze
```

**Request Body:**
```json
{
  "content": "Hemen bahis yap, yüksek oranlarla kazan!",
  "sender": "+905551234567",
  "sender_phone": "+905551234567",
  "source": "sms"
}
```

**Response (201):**
```json
{
  "id": "507f1f77bcf86cd799439012",
  "content": "Hemen bahis yap, yüksek oranlarla kazan!",
  "sender": "+905551234567",
  "sender_phone": "+905551234567",
  "source": "sms",
  "analysis": {
    "is_spam": true,
    "confidence": 0.95,
    "category": "betting",
    "risk_level": "high",
    "explanation": "Yasadışı bahis/kumar içeriği tespit edildi",
    "detected_patterns": ["bahis", "kazan"],
    "recommended_action": "block"
  },
  "is_blocked": true,
  "created_at": "2024-01-15T10:35:00Z",
  "user_feedback": null
}
```

### Bulk Analyze

```http
POST /messages/analyze/bulk
```

**Request Body:**
```json
{
  "messages": [
    {"content": "Message 1", "source": "manual"},
    {"content": "Message 2", "source": "sms"}
  ]
}
```

**Response:**
```json
{
  "total": 2,
  "spam_count": 1,
  "safe_count": 1,
  "results": [...]
}
```

### Get Message History

```http
GET /messages?skip=0&limit=50&spam_only=false
```

### Get Statistics

```http
GET /messages/stats
```

**Response:**
```json
{
  "total_analyzed": 150,
  "total_spam": 45,
  "total_safe": 105,
  "spam_by_category": {
    "betting": 25,
    "phishing": 10,
    "scam": 8,
    "promotional": 2
  },
  "blocked_count": 40,
  "accuracy_feedback": {
    "correct": 38,
    "incorrect": 5,
    "unsure": 2
  }
}
```

### Provide Feedback

```http
PATCH /messages/{message_id}/feedback
```

**Request Body:**
```json
{
  "feedback": "correct"
}
```

### Delete Message

```http
DELETE /messages/{message_id}
```

---

## User Endpoints

### Get Profile

```http
GET /users/me
```

### Update Profile

```http
PATCH /users/me
```

**Request Body:**
```json
{
  "full_name": "New Name",
  "phone": "+905559876543",
  "language": "en"
}
```

### Change Password

```http
POST /users/me/change-password
```

**Request Body:**
```json
{
  "current_password": "oldpassword",
  "new_password": "newpassword123"
}
```

### Get Settings

```http
GET /users/me/settings
```

**Response:**
```json
{
  "user_id": "507f1f77bcf86cd799439011",
  "auto_block_spam": true,
  "auto_block_threshold": 0.8,
  "notifications_enabled": true,
  "language": "tr",
  "whitelist": [],
  "blacklist": [],
  "block_categories": ["betting", "phishing", "scam", "malware", "fraud"],
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

### Update Settings

```http
PATCH /users/me/settings
```

**Request Body:**
```json
{
  "auto_block_spam": true,
  "auto_block_threshold": 0.9,
  "notifications_enabled": false,
  "block_categories": ["betting", "phishing"]
}
```

### Add to Whitelist

```http
POST /users/me/whitelist
```

**Request Body:**
```json
{
  "value": "+905551234567",
  "type": "phone",
  "note": "My bank"
}
```

### Remove from Whitelist

```http
DELETE /users/me/whitelist/{value}
```

### Add to Blacklist

```http
POST /users/me/blacklist
```

**Request Body:**
```json
{
  "value": "+901234567890",
  "type": "phone",
  "reason": "Spam sender"
}
```

### Remove from Blacklist

```http
DELETE /users/me/blacklist/{value}
```

### Delete Account

```http
DELETE /users/me
```

---

## Error Responses

### 400 Bad Request
```json
{
  "detail": "Email already registered"
}
```

### 401 Unauthorized
```json
{
  "detail": "Invalid email or password"
}
```

### 403 Forbidden
```json
{
  "detail": "Not authenticated"
}
```

### 404 Not Found
```json
{
  "detail": "Message not found"
}
```

### 422 Validation Error
```json
{
  "detail": "Validation error",
  "errors": [
    {
      "field": "body -> email",
      "message": "value is not a valid email address",
      "type": "value_error.email"
    }
  ]
}
```

### 500 Internal Server Error
```json
{
  "detail": "Internal server error",
  "message": "An unexpected error occurred"
}
```

---

## Rate Limiting

| Endpoint | Rate Limit |
|----------|------------|
| `/auth/*` | 10 requests/minute |
| `/messages/analyze` | 60 requests/minute |
| `/messages/analyze/bulk` | 10 requests/minute |
| Other endpoints | 100 requests/minute |

---

## Spam Categories

| Category | Description |
|----------|-------------|
| `safe` | Not spam |
| `betting` | Illegal betting/gambling |
| `phishing` | Credential theft attempts |
| `scam` | Financial scams |
| `malware` | Malicious links |
| `promotional` | Unwanted ads |
| `fraud` | Identity fraud |
| `lottery` | Fake lottery/prizes |
| `investment` | Fake investment schemes |
| `other` | Other spam types |

## Risk Levels

| Level | Action |
|-------|--------|
| `low` | Allow |
| `medium` | Warn user |
| `high` | Block |
| `critical` | Immediately block |
