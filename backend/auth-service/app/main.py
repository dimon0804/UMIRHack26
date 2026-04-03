import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import auth as auth_routes
from app.api.routes import health as health_routes
from app.core.config import settings
from app.core.logging_config import setup_logging
from app.db.session import init_db
from app.models import RefreshToken, User  # noqa: F401 — register metadata

setup_logging(settings.app_name)
log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    log.info("Database initialized")
    yield


app = FastAPI(
    title="Auth Service",
    description="Регистрация, логин, JWT access/refresh для платформы симулятора кибератак",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_routes.router)
app.include_router(auth_routes.router)
