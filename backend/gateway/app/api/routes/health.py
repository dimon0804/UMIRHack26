import logging

import httpx
from fastapi import APIRouter, Request

from app.core.config import settings

log = logging.getLogger(__name__)
router = APIRouter(tags=["health"])


@router.get("/health")
async def gateway_health() -> dict[str, str]:
    return {"status": "ok", "service": "api-gateway"}


@router.get("/api/v1/health")
async def aggregated_health(request: Request) -> dict:
    """Best-effort статусы downstream (для k8s / мониторинга)."""
    result: dict = {"gateway": "ok", "services": {}}
    targets = {
        "auth": f"{settings.auth_service_url.rstrip('/')}/health",
        "simulation": f"{settings.simulation_service_url.rstrip('/')}/health",
        "progress": f"{settings.progress_service_url.rstrip('/')}/health",
    }
    async with httpx.AsyncClient(timeout=httpx.Timeout(3.0)) as client:
        for name, url in targets.items():
            try:
                r = await client.get(url)
                result["services"][name] = "ok" if r.status_code == 200 else f"http_{r.status_code}"
            except httpx.RequestError as e:
                log.debug("health check %s failed: %s", name, e)
                result["services"][name] = "unavailable"
    return result
