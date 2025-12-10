# NEXURA-AI Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Mobile App (Expo)                        │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────────┐ │
│  │ Login   │  │ Analyze │  │ History │  │    Settings     │ │
│  │ Screen  │  │ Screen  │  │ Screen  │  │     Screen      │ │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────────┬────────┘ │
│       │            │            │                 │          │
│       └────────────┴────────────┴─────────────────┘          │
│                            │                                  │
│                    ┌───────┴───────┐                         │
│                    │   API Client  │                         │
│                    │   (Axios)     │                         │
│                    └───────┬───────┘                         │
└────────────────────────────┼────────────────────────────────┘
                             │
                             │ HTTPS/REST
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    FastAPI Backend                           │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                     API Layer                           ││
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────┐││
│  │  │   Auth     │  │  Messages  │  │      Users         │││
│  │  │  Endpoints │  │  Endpoints │  │    Endpoints       │││
│  │  └─────┬──────┘  └──────┬─────┘  └─────────┬──────────┘││
│  └────────┼────────────────┼──────────────────┼───────────┘│
│           │                │                  │             │
│  ┌────────┴────────────────┴──────────────────┴───────────┐│
│  │                   Service Layer                         ││
│  │  ┌────────────┐  ┌─────────────┐  ┌──────────────────┐ ││
│  │  │   Auth     │  │   Message   │  │      User        │ ││
│  │  │  Service   │  │   Service   │  │    Service       │ ││
│  │  └────────────┘  └──────┬──────┘  └──────────────────┘ ││
│  │                         │                               ││
│  │                  ┌──────┴──────┐                        ││
│  │                  │    Spam     │                        ││
│  │                  │  Detector   │───────┐                ││
│  │                  └─────────────┘       │                ││
│  └────────────────────────────────────────┼────────────────┘│
│                                           │                 │
└───────────────────────────────────────────┼─────────────────┘
                             │              │
                             │              │
              ┌──────────────┘              └──────────────┐
              │                                            │
              ▼                                            ▼
    ┌─────────────────┐                        ┌─────────────────┐
    │    MongoDB      │                        │    OpenAI API   │
    │                 │                        │   (GPT-4o-mini) │
    │  ┌───────────┐  │                        │                 │
    │  │  users    │  │                        │  Spam Analysis  │
    │  ├───────────┤  │                        │  Natural Lang.  │
    │  │ messages  │  │                        │  Processing     │
    │  ├───────────┤  │                        │                 │
    │  │ settings  │  │                        └─────────────────┘
    │  └───────────┘  │
    └─────────────────┘
```

## Component Details

### Mobile App (React Native + Expo)

#### Screens
- **LoginScreen** - User authentication
- **RegisterScreen** - New user registration
- **HomeScreen** - Dashboard with stats
- **AnalyzeScreen** - Main spam detection interface
- **HistoryScreen** - Message history with filtering
- **SettingsScreen** - App configuration
- **ProfileScreen** - User profile management
- **MessageDetailScreen** - Detailed analysis view

#### Contexts
- **AuthContext** - Authentication state management
- **ThemeContext** - Dark/light theme switching
- **LanguageContext** - i18n localization (TR/EN)

#### Services
- **API Client** - Axios-based HTTP client with interceptors
- **TokenManager** - Secure token storage (expo-secure-store)

### Backend (FastAPI)

#### API Layer (`app/api/`)
- RESTful endpoints
- Request validation (Pydantic)
- JWT authentication middleware
- CORS configuration

#### Service Layer (`app/services/`)
- **AuthService** - Registration, login, token management
- **SpamDetector** - AI-powered spam analysis
- **MessageService** - Message CRUD operations
- **UserService** - Profile & settings management

#### Core (`app/core/`)
- **config.py** - Environment configuration
- **database.py** - MongoDB connection (Motor)
- **security.py** - JWT & bcrypt utilities

### Database Schema

#### Users Collection
```json
{
  "_id": "ObjectId",
  "email": "string (unique)",
  "hashed_password": "string (bcrypt)",
  "full_name": "string",
  "phone": "string (optional)",
  "language": "tr|en",
  "is_active": "boolean",
  "is_verified": "boolean",
  "created_at": "datetime",
  "updated_at": "datetime",
  "total_messages_analyzed": "integer",
  "total_spam_blocked": "integer"
}
```

#### Messages Collection
```json
{
  "_id": "ObjectId",
  "user_id": "string",
  "content": "string",
  "sender": "string (optional)",
  "sender_phone": "string (optional)",
  "source": "sms|manual|api",
  "analysis": {
    "is_spam": "boolean",
    "confidence": "float (0-1)",
    "category": "safe|betting|phishing|scam|...",
    "risk_level": "low|medium|high|critical",
    "explanation": "string",
    "detected_patterns": ["array"],
    "recommended_action": "allow|warn|block"
  },
  "is_blocked": "boolean",
  "created_at": "datetime",
  "user_feedback": "correct|incorrect|unsure|null"
}
```

#### Settings Collection
```json
{
  "_id": "ObjectId",
  "user_id": "string",
  "auto_block_spam": "boolean",
  "auto_block_threshold": "float (0-1)",
  "notifications_enabled": "boolean",
  "language": "tr|en",
  "whitelist": [
    {"value": "string", "type": "phone|keyword|sender", "note": "string"}
  ],
  "blacklist": [
    {"value": "string", "type": "phone|keyword|sender", "reason": "string"}
  ],
  "block_categories": ["array of categories"],
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

## Spam Detection Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                    Spam Detection Flow                       │
└─────────────────────────────────────────────────────────────┘

     Input Message
          │
          ▼
    ┌───────────────┐
    │  Check        │──── Match ────► Safe (confidence: 1.0)
    │  Whitelist    │
    └───────────────┘
          │ No Match
          ▼
    ┌───────────────┐
    │  Check        │──── Match ────► Spam (confidence: 1.0)
    │  Blacklist    │
    └───────────────┘
          │ No Match
          ▼
    ┌───────────────┐
    │  Local        │──── High Confidence ────► Return Result
    │  Pattern      │     (>= 0.9)
    │  Matching     │
    └───────────────┘
          │ Low Confidence
          ▼
    ┌───────────────┐
    │  OpenAI       │
    │  GPT-4o-mini  │──────────────────────────► Return Result
    │  Analysis     │
    └───────────────┘
```

## Security Architecture

### Authentication Flow
```
1. User submits credentials
2. Server validates & returns JWT tokens
3. Access token (30 min) for API requests
4. Refresh token (7 days) for token renewal
5. Tokens stored in expo-secure-store (encrypted)
```

### Security Measures
- bcrypt password hashing (cost factor: 12)
- JWT with HS256 algorithm
- CORS whitelist enforcement
- Input validation (Pydantic)
- Rate limiting (configurable)
- Secure token storage (Keychain/Keystore)

## Deployment Architecture

### Production Setup
```
┌─────────────────────────────────────────┐
│              Load Balancer              │
│              (nginx/AWS ALB)            │
└─────────────────┬───────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
┌───────────────┐   ┌───────────────┐
│   Backend     │   │   Backend     │
│   Instance 1  │   │   Instance 2  │
└───────┬───────┘   └───────┬───────┘
        │                   │
        └─────────┬─────────┘
                  │
                  ▼
        ┌─────────────────┐
        │  MongoDB Atlas  │
        │  (Replica Set)  │
        └─────────────────┘
```

## Performance Considerations

1. **Local Pattern Matching First** - Fast spam detection without API calls
2. **MongoDB Indexes** - On user_id, email, created_at
3. **Connection Pooling** - Motor async driver
4. **Caching** - Consider Redis for frequent queries
5. **Async/Await** - Non-blocking I/O throughout
