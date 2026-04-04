"""События для Live SOC Wall (Redis pub/sub). Дублируется в auth/simulation/progress (разные Docker-контексты)."""

from __future__ import annotations

import json
import logging
import os
import threading
import uuid
from datetime import UTC, datetime
from typing import Any

log = logging.getLogger(__name__)

_lock = threading.Lock()
_r = None

CHANNEL = "soc:events"
RECENT = "soc:events:recent"
STATS_KEY = "soc:stats:global"


def _client():
    global _r
    url = (os.getenv("REDIS_URL") or "").strip()
    if not url:
        return None
    with _lock:
        if _r is None:
            import redis

            _r = redis.Redis.from_url(url, decode_responses=True, socket_connect_timeout=1.5, socket_timeout=1.5)
    return _r


def emit_soc_event(kind: str, fields: dict[str, Any] | None = None) -> None:
    r = _client()
    if not r:
        return
    try:
        event = {
            "id": str(uuid.uuid4()),
            "ts": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
            "kind": kind,
            **(fields or {}),
        }
        msg = json.dumps(event, ensure_ascii=False)
        r.publish(CHANNEL, msg)
        pipe = r.pipeline()
        pipe.lpush(RECENT, msg)
        pipe.ltrim(RECENT, 0, 199)
        pipe.hincrby(STATS_KEY, kind, 1)
        pipe.hincrby(STATS_KEY, "total", 1)
        pipe.execute()
    except Exception as exc:
        log.debug("soc emit skipped: %s", exc)
