from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

from db.database import init_db
from api.auth import router as auth_router
from api.kyc import router as kyc_router
from api.payments import router as payments_router
from api.wallet import router as wallet_router
from api.rates import router as rates_router
from api.webhooks import router as webhooks_router

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    print("✅ Solanka backend started")
    print(f"📡 Network: {os.getenv('SOLANA_NETWORK', 'devnet')}")
    yield
    print("Solanka shutting down...")

app = FastAPI(
    title="Solanka API",
    description="Solana-powered payment and developer toolkit for African businesses.",
    version="1.0.0",
    lifespan=lifespan
)

# Session middleware — required for Google OAuth state management
app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("JWT_SECRET_KEY", "solanka-dev-secret-change-in-prod-!xQz9"),
    same_site="lax",
    https_only=os.getenv("RAILWAY_ENVIRONMENT") is not None,  # HTTPS-only on Railway
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Register routers
app.include_router(auth_router,     prefix="/api/v1")
app.include_router(kyc_router,      prefix="/api/v1")
app.include_router(payments_router, prefix="/api/v1")
app.include_router(wallet_router,   prefix="/api/v1")
app.include_router(rates_router,    prefix="/api/v1")
app.include_router(webhooks_router, prefix="/api/v1")

@app.get("/pay/{slug}")
async def checkout_page(slug: str):
    return FileResponse("static/checkout.html")

@app.get("/")
async def root():
    return {
        "project": "Solanka",
        "tagline": "Yours, on Solana",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "running"
    }

@app.get("/health")
async def health():
    return {"status": "healthy", "network": os.getenv("SOLANA_NETWORK", "devnet")}
