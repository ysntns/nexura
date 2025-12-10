# NEXURA-AI

<div align="center">
  <h3>AI-Powered Spam Detection Mobile Application</h3>
  <p>Yapay Zeka Destekli Spam Algılama Mobil Uygulaması</p>

  ![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
  ![License](https://img.shields.io/badge/license-MIT-green.svg)
  ![Platform](https://img.shields.io/badge/platform-Android-brightgreen.svg)
</div>

---

## Overview / Genel Bakış

NEXURA-AI is a comprehensive spam detection mobile application that uses artificial intelligence to protect users from unwanted messages, phishing attempts, and scam communications. The application is specifically optimized for **Turkish** and **English** language support.

NEXURA-AI, kullanıcıları istenmeyen mesajlardan, oltalama girişimlerinden ve dolandırıcılık iletişimlerinden korumak için yapay zeka kullanan kapsamlı bir spam algılama mobil uygulamasıdır. Uygulama özellikle **Türkçe** ve **İngilizce** dil desteği için optimize edilmiştir.

---

## Features / Özellikler

### Core Features / Temel Özellikler

- **AI-Powered Detection / AI Destekli Algılama**
  - GPT-4o-mini integration for high-accuracy spam detection
  - Local pattern matching for instant Turkish betting spam detection
  - 90-98% confidence accuracy

- **Multi-Language Support / Çok Dilli Destek**
  - Turkish (Türkçe)
  - English

- **Real-time Analysis / Gerçek Zamanlı Analiz**
  - Instant message scanning
  - Detailed risk assessment
  - Category classification

- **Smart Auto-Blocking / Akıllı Otomatik Engelleme**
  - Configurable threshold settings
  - Category-based blocking
  - Whitelist/Blacklist management

### Spam Categories / Spam Kategorileri

| Category | Description (EN) | Açıklama (TR) |
|----------|-----------------|---------------|
| `betting` | Illegal betting/gambling | Yasadışı bahis/kumar |
| `phishing` | Credential theft attempts | Kimlik avı saldırıları |
| `scam` | Financial scams | Dolandırıcılık |
| `malware` | Malicious links | Zararlı yazılım |
| `fraud` | Identity fraud | Kimlik hırsızlığı |
| `lottery` | Fake lottery/prizes | Sahte çekiliş |
| `promotional` | Unwanted ads | İstenmeyen reklamlar |

---

## Tech Stack / Teknoloji Yığını

### Backend
- **Framework:** FastAPI (Python 3.11+)
- **Database:** MongoDB with Motor async driver
- **Authentication:** JWT + bcrypt
- **AI:** OpenAI GPT-4o-mini

### Mobile App
- **Framework:** React Native + Expo
- **Navigation:** React Navigation 6
- **State Management:** React Context + Zustand
- **Build:** EAS Build (APK/AAB)

### Infrastructure
- **Containerization:** Docker + Docker Compose
- **API Documentation:** Swagger/OpenAPI

---

## Project Structure / Proje Yapısı

```
nexura/
├── backend/                    # FastAPI Backend
│   ├── app/
│   │   ├── api/               # API endpoints
│   │   │   └── endpoints/     # Route handlers
│   │   ├── core/              # Configuration & security
│   │   ├── models/            # Pydantic models
│   │   └── services/          # Business logic
│   ├── tests/                 # Pytest test suite
│   ├── requirements.txt       # Python dependencies
│   └── Dockerfile
│
├── frontend/                   # React Native App
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── screens/           # App screens
│   │   ├── services/          # API client
│   │   ├── contexts/          # React contexts
│   │   ├── navigation/        # Navigation config
│   │   └── utils/             # Utilities
│   ├── App.tsx                # Entry point
│   ├── app.json               # Expo config
│   └── eas.json               # EAS Build config
│
├── docs/                       # Documentation
├── docker-compose.yml          # Docker orchestration
└── README.md
```

---

## Getting Started / Başlangıç

### Prerequisites / Gereksinimler

- Python 3.11+
- Node.js 18+
- MongoDB 6.0+
- Docker & Docker Compose (optional)
- OpenAI API Key

### Backend Setup / Backend Kurulumu

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or
.\venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env
# Edit .env with your configuration

# Run the server
uvicorn app.main:app --reload --port 8000
```

### Mobile App Setup / Mobil Uygulama Kurulumu

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Expo development server
npx expo start

# Run on Android emulator
npx expo start --android
```

### Docker Setup / Docker Kurulumu

```bash
# Start all services
docker-compose up -d

# Start with development tools (Mongo Express)
docker-compose --profile dev up -d

# View logs
docker-compose logs -f backend
```

---

## API Documentation / API Dokümantasyonu

Once the backend is running, access the interactive API documentation:

- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

### Key Endpoints / Ana Endpoint'ler

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | User login |
| POST | `/api/v1/messages/analyze` | Analyze message for spam |
| GET | `/api/v1/messages/` | Get message history |
| GET | `/api/v1/messages/stats` | Get statistics |
| GET | `/api/v1/users/me` | Get user profile |
| PATCH | `/api/v1/users/me/settings` | Update settings |

---

## Building APK / APK Oluşturma

### Using EAS Build

```bash
cd frontend

# Configure EAS
npx eas-cli login
npx eas-cli build:configure

# Build APK (preview profile)
npx eas-cli build --platform android --profile preview

# Build production AAB
npx eas-cli build --platform android --profile production
```

### Local Build (requires Android SDK)

```bash
# Generate native project
npx expo prebuild

# Build APK
cd android
./gradlew assembleRelease
```

---

## Testing / Test

### Backend Tests

```bash
cd backend

# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_spam_detector.py -v
```

### Frontend Tests

```bash
cd frontend

# Run Jest tests
npm test
```

---

## Environment Variables / Ortam Değişkenleri

### Backend (.env)

```env
# MongoDB
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=nexura_db

# JWT
SECRET_KEY=your-super-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# OpenAI
OPENAI_API_KEY=sk-your-api-key

# App
DEBUG=True
ALLOWED_ORIGINS=http://localhost:8081
```

---

## Security Features / Güvenlik Özellikleri

- **Authentication:** JWT-based with refresh tokens
- **Password:** bcrypt hashing
- **CORS:** Configurable origin whitelist
- **Input Validation:** Pydantic models
- **Rate Limiting:** Configurable per endpoint

---

## Contributing / Katkıda Bulunma

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License / Lisans

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Support / Destek

For support, please open an issue in the GitHub repository or contact the development team.

---

<div align="center">
  <p>Made with ❤️ for safer mobile communication</p>
  <p>Daha güvenli mobil iletişim için ❤️ ile yapıldı</p>
</div>
