"""Подключения WebSocket для Live SOC Wall."""

from __future__ import annotations

import asyncio
import json
from typing import Any

from fastapi import WebSocket


class SocHub:
    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self._clients: set[WebSocket] = set()
        self._ws_team: dict[int, str] = {}
        self._team_counts: dict[str, int] = {}

    def get_meta(self) -> dict[str, Any]:
        return {
            "viewers": len(self._clients),
            "teams": dict(sorted(self._team_counts.items(), key=lambda x: (-x[1], x[0]))),
        }

    async def register(self, websocket: WebSocket, team: str | None) -> None:
        await websocket.accept()
        t = (team or "watch").strip()[:24] or "watch"
        async with self._lock:
            self._clients.add(websocket)
            self._ws_team[id(websocket)] = t
            self._team_counts[t] = self._team_counts.get(t, 0) + 1

    async def unregister(self, websocket: WebSocket) -> None:
        async with self._lock:
            tid = id(websocket)
            t = self._ws_team.pop(tid, None)
            self._clients.discard(websocket)
            if t:
                c = self._team_counts.get(t, 0) - 1
                if c <= 0:
                    self._team_counts.pop(t, None)
                else:
                    self._team_counts[t] = c

    async def broadcast_meta(self) -> None:
        payload = {"kind": "_meta", **self.get_meta()}
        await self.broadcast_text(json.dumps(payload, ensure_ascii=False))

    async def broadcast_text(self, text: str) -> None:
        async with self._lock:
            clients = list(self._clients)
        dead: list[WebSocket] = []
        for c in clients:
            try:
                await c.send_text(text)
            except Exception:
                dead.append(c)
        for c in dead:
            await self.unregister(c)


hub = SocHub()
