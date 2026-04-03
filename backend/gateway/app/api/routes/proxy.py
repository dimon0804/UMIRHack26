import logging

import httpx
from fastapi import APIRouter, Request, Response

from app.core.config import settings
from app.proxy.client import forward_request

log = logging.getLogger(__name__)

router = APIRouter()


@router.api_route(
    "/api/v1/auth/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
)
async def proxy_auth(path: str, request: Request) -> Response:
    client: httpx.AsyncClient = request.app.state.http_client
    base = settings.auth_service_url.rstrip("/")
    return await forward_request(client, base_url=base, path=f"auth/{path}", request=request)


@router.api_route(
    "/api/v1/simulation/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
)
async def proxy_simulation(path: str, request: Request) -> Response:
    client: httpx.AsyncClient = request.app.state.http_client
    base = settings.simulation_service_url.rstrip("/")
    return await forward_request(client, base_url=base, path=path, request=request)


@router.api_route(
    "/api/v1/ai/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
)
async def proxy_ai(path: str, request: Request) -> Response:
    client: httpx.AsyncClient = request.app.state.http_client
    base = settings.ai_service_url.rstrip("/")
    return await forward_request(client, base_url=base, path=path, request=request)


@router.api_route(
    "/api/v1/progress/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
)
async def proxy_progress(path: str, request: Request) -> Response:
    client: httpx.AsyncClient = request.app.state.http_client
    base = settings.progress_service_url.rstrip("/")
    return await forward_request(client, base_url=base, path=path, request=request)
