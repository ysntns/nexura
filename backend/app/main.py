"""NEXURA-AI FastAPI Application"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.database import database
from app.api.routes import api_router

# Configure logging
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Configure rate limiter
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup and shutdown"""
    # Startup
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    await database.connect()
    logger.info("Database connected successfully")

    yield

    # Shutdown
    logger.info("Shutting down application")
    await database.disconnect()
    logger.info("Database disconnected")


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    description="""
# NEXURA-AI - Akıllı Spam Algılama Sistemi

**Türkçe ve İngilizce destekli yapay zeka tabanlı spam ve dolandırıcılık tespit uygulaması.**

## Özellikler / Features

- **AI-Powered Detection**: GPT-4o-mini ile yüksek doğruluklu spam tespiti
- **Turkish Support**: Türkçe mesajlar için optimize edilmiş kalıp tanıma
- **Auto-Blocking**: Otomatik spam engelleme (yapılandırılabilir eşik değeri)
- **Whitelist/Blacklist**: Güvenilir ve engellenmiş gönderici yönetimi
- **Detailed Analytics**: Mesaj istatistikleri ve kategori dağılımı

## Spam Kategorileri / Spam Categories

| Kategori | Açıklama |
|----------|----------|
| betting | Yasadışı bahis/kumar |
| phishing | Kimlik avı saldırıları |
| scam | Dolandırıcılık |
| malware | Zararlı yazılım linkleri |
| fraud | Kimlik hırsızlığı |
| lottery | Sahte çekiliş/piyango |
| promotional | İstenmeyen reklamlar |

## Risk Seviyeleri / Risk Levels

- **low**: Düşük risk - izin ver
- **medium**: Orta risk - uyar
- **high**: Yüksek risk - engelle
- **critical**: Kritik risk - kesinlikle engelle
    """,
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["Content-Type", "Authorization", "Accept", "Origin"],
    max_age=600,  # Cache preflight requests for 10 minutes
)

# Add rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# Exception handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors with detailed messages"""
    errors = []
    for error in exc.errors():
        field = " -> ".join(str(loc) for loc in error["loc"])
        errors.append({
            "field": field,
            "message": error["msg"],
            "type": error["type"],
        })

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": "Validation error",
            "errors": errors,
        },
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle unexpected errors"""
    logger.error(f"Unexpected error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "Internal server error",
            "message": str(exc) if settings.DEBUG else "An unexpected error occurred",
        },
    )


# Include API routes
app.include_router(api_router)


# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    """
    Health check endpoint for monitoring.

    Returns application status and version.
    """
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }


# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    """
    Root endpoint with API information.
    """
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "description": "AI-Powered Spam Detection API",
        "docs": "/docs",
        "health": "/health",
    }
