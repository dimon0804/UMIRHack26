import asyncio
import logging
from contextlib import asynccontextmanager

import httpx
import redis.asyncio as redis
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import health as health_routes
from app.api.routes import proxy as proxy_routes
from app.api.routes import soc_wall as soc_wall_routes
from app.core.config import settings
from app.core.logging_config import setup_logging
from app.soc.redis_listener import run_soc_redis_listener

setup_logging(settings.app_name)
log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Длинные ответы Mistral (generate-track, chat) — не обрывать на 60 с
    app.state.http_client = httpx.AsyncClient(
        limits=httpx.Limits(max_keepalive_connections=20, max_connections=100),
        timeout=httpx.Timeout(connect=20.0, read=180.0, write=60.0, pool=20.0),
    )
    log.info("HTTP client started")

    app.state.redis = None
    app.state.soc_stop = asyncio.Event()
    app.state.soc_listener_task = None
    ru = (settings.redis_url or "").strip()
    if ru:
        app.state.redis = redis.from_url(ru, decode_responses=True)
        app.state.soc_listener_task = asyncio.create_task(run_soc_redis_listener(ru, app.state.soc_stop))
        log.info("Live SOC: Redis client + subscriber started")

    yield

    app.state.soc_stop.set()
    t = getattr(app.state, "soc_listener_task", None)
    if t:
        t.cancel()
        try:
            await t
        except asyncio.CancelledError:
            pass
    if getattr(app.state, "redis", None) is not None:
        await app.state.redis.aclose()
        log.info("Live SOC: Redis closed")

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
app.include_router(soc_wall_routes.router)
app.include_router(proxy_routes.router)
