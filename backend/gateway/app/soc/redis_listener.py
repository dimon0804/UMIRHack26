"""Подписка на Redis pub/sub и рассылка в WebSocket-клиентов."""

from __future__ import annotations

import asyncio
import logging

import redis.asyncio as redis

from app.soc.hub import hub

log = logging.getLogger(__name__)


async def run_soc_redis_listener(redis_url: str, stop: asyncio.Event) -> None:
    while not stop.is_set():
        r: redis.Redis | None = None
        try:
            r = redis.from_url(redis_url, decode_responses=True)
            pubsub = r.pubsub()
            await pubsub.subscribe("soc:events")
            log.info("Live SOC: subscribed to Redis channel soc:events")
            async for message in pubsub.listen():
                if stop.is_set():
                    break
                if message.get("type") != "message":
                    continue
                data = message.get("data")
                if isinstance(data, str) and data:
                    await hub.broadcast_text(data)
        except asyncio.CancelledError:
            break
        except Exception as exc:
            log.warning("Live SOC Redis listener: %s — retry in 3s", exc)
            await asyncio.sleep(3)
        finally:
            if r is not None:
                try:
                    await r.aclose()
                except Exception:
                    pass
