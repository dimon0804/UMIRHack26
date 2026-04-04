"""Live SOC Wall: WebSocket поток + счётчики."""

from __future__ import annotations

import json
import logging
from typing import Any

import redis.asyncio as redis
from fastapi import APIRouter, Query, WebSocket

from app.core.config import settings
from app.soc.hub import hub

log = logging.getLogger(__name__)

router = APIRouter(tags=["soc"])


@router.get("/api/v1/soc/stats")
async def soc_stats() -> dict[str, Any]:
    """Агрегированные счётчики из Redis (без WebSocket)."""
    url = (settings.redis_url or "").strip()
    if not url:
        return {"redis": False, "stats": {}}
    r = redis.from_url(url, decode_responses=True)
    try:
        stats = await r.hgetall("soc:stats:global")
        return {"redis": True, "stats": stats or {}, "live_viewers": hub.get_meta()["viewers"]}
    finally:
        await r.aclose()


@router.websocket("/api/v1/soc/ws")
async def soc_websocket(websocket: WebSocket, team: str | None = Query(default=None)) -> None:
    await hub.register(websocket, team)
    await hub.broadcast_meta()

    app = websocket.app
    ar: redis.Redis | None = getattr(app.state, "redis", None)
    try:
        snap: dict[str, Any] = {"kind": "_snapshot", "recent": [], "stats": {}, **hub.get_meta()}
        if ar is not None:
            try:
                raw = await ar.lrange("soc:events:recent", 0, 49)
                recent: list[Any] = []
                for s in reversed(raw or []):
                    try:
                        recent.append(json.loads(s))
                    except json.JSONDecodeError:
                        pass
                snap["recent"] = recent
                snap["stats"] = await ar.hgetall("soc:stats:global") or {}
            except Exception as exc:
                log.debug("soc snapshot: %s", exc)
        await websocket.send_text(json.dumps(snap, ensure_ascii=False))

        while True:
            message = await websocket.receive()
            if message["type"] == "websocket.disconnect":
                break
    finally:
        await hub.unregister(websocket)
        await hub.broadcast_meta()
