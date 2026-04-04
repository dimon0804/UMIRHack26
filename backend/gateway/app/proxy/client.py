import json
import logging
from collections.abc import Mapping

import httpx
from fastapi import Request, Response

log = logging.getLogger(__name__)

HOP_BY_HOP = {
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
    "host",
    "content-length",
}


def filter_headers(headers: Mapping[str, str]) -> dict[str, str]:
    out: dict[str, str] = {}
    for k, v in headers.items():
        lk = k.lower()
        if lk in HOP_BY_HOP:
            continue
        out[k] = v
    return out


async def forward_request(
    client: httpx.AsyncClient,
    *,
    base_url: str,
    path: str,
    request: Request,
) -> Response:
    url = f"{base_url.rstrip('/')}/{path.lstrip('/')}"
    body = await request.body()
    headers = filter_headers(request.headers)
    try:
        resp = await client.request(
            request.method,
            url,
            content=body if body else None,
            headers=headers,
            params=request.query_params.multi_items(),
            timeout=httpx.Timeout(connect=20.0, read=180.0, write=60.0, pool=20.0),
        )
    except httpx.RequestError as e:
        log.warning("Upstream error: %s %s -> %s", request.method, url, e)
        detail = (
            "upstream_unavailable: "
            f"{type(e).__name__}: {e!s}. "
            "Проверьте, что целевой сервис запущен и AI_SERVICE_URL в gateway указывает на него."
        )
        body = json.dumps({"detail": detail}, ensure_ascii=False).encode("utf-8")
        return Response(
            content=body,
            status_code=502,
            media_type="application/json; charset=utf-8",
        )
    ct = resp.headers.get("content-type", "application/json")
    return Response(content=resp.content, status_code=resp.status_code, media_type=ct)
