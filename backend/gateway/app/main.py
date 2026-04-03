import logging
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import health as health_routes
from app.api.routes import proxy as proxy_routes
from app.core.config import settings
from app.core.logging_config import setup_logging

setup_logging(settings.app_name)
log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.http_client = httpx.AsyncClient(
        limits=httpx.Limits(max_keepalive_connections=20, max_connections=100),
        timeout=httpx.Timeout(60.0),
    )
    log.info("HTTP client started")
    yield
    await app.state.http_client.aclose()
    log.info("HTTP client closed")


app = FastAPI(
    title="API Gateway",
    description="Единая точка входа: проксирование к микросервисам, CORS, подготовка к JWT-гейту",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_routes.router)
app.include_router(proxy_routes.router)
