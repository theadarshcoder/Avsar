"""FastAPI entrypoint for avsar Phase 1.

Wires all routers under /api and creates required MongoDB indexes at startup.
"""
from __future__ import annotations

import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI
from starlette.middleware.cors import CORSMiddleware

from database import client, ensure_indexes
from routes.auth import router as auth_router
from routes.checkout import router as checkout_router
from routes.clinics import router as clinics_router
from routes.slots import router as slots_router
from routes.webhooks.razorpay import router as razorpay_router
from routes.webhooks.whatsapp import router as whatsapp_router

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("avsar")

app = FastAPI(
    title="avsar",
    version="0.1.0",
    description="Standby-slot filler for dental clinics — Phase 1 backend.",
    openapi_url="/api/openapi.json",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {"service": "avsar", "phase": 1, "status": "ok"}


@api_router.get("/health")
async def health():
    return {"status": "ok"}


api_router.include_router(auth_router)
api_router.include_router(clinics_router)
api_router.include_router(slots_router)
api_router.include_router(checkout_router)
api_router.include_router(razorpay_router)
api_router.include_router(whatsapp_router)

app.include_router(api_router)
app.include_router(razorpay_router)
app.include_router(whatsapp_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def _startup():
    await ensure_indexes()
    logger.info("avsar backend ready — indexes ensured")


@app.on_event("shutdown")
async def _shutdown():
    client.close()
