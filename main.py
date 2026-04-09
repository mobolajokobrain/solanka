from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

from db.database import init_db
from api.auth import router as auth_router
from api.payments import router as payments_router
from api.wallet import router as wallet_router
from api.rates import router as rates_router

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup — initialize database
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

# CORS — allow frontend and mobile app
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
app.include_router(payments_router, prefix="/api/v1")
app.include_router(wallet_router,   prefix="/api/v1")
app.include_router(rates_router,    prefix="/api/v1")

@app.get("/pay/{slug}")
async def checkout_page(slug: str):
    """Serve the checkout page for a payment link."""
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
