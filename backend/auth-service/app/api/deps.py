import uuid

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from app.core.exceptions import LocalizedMessage
from app.core.i18n import localize, pick_locale
from app.core.security import decode_access_token

security = HTTPBearer(auto_error=False)

UNAUTHORIZED = LocalizedMessage(
    code="auth.unauthorized",
    ru="Требуется авторизация",
    en="Authentication required",
)
INVALID_TOKEN = LocalizedMessage(
    code="auth.invalid_token",
    ru="Недействительный токен",
    en="Invalid token",
)


async def get_current_user_id(
    request: Request,
    creds: HTTPAuthorizationCredentials | None = Depends(security),
) -> uuid.UUID:
    locale = pick_locale(request)
    if creds is None or creds.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=401,
            detail={
                "code": UNAUTHORIZED.code,
                "message": localize(UNAUTHORIZED, locale),
                "messages": {"ru": UNAUTHORIZED.ru, "en": UNAUTHORIZED.en},
            },
        )
    try:
        payload = decode_access_token(creds.credentials)
    except Exception:
        raise HTTPException(
            status_code=401,
            detail={
                "code": INVALID_TOKEN.code,
                "message": localize(INVALID_TOKEN, locale),
                "messages": {"ru": INVALID_TOKEN.ru, "en": INVALID_TOKEN.en},
            },
        )
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=401,
            detail={
                "code": INVALID_TOKEN.code,
                "message": localize(INVALID_TOKEN, locale),
                "messages": {"ru": INVALID_TOKEN.ru, "en": INVALID_TOKEN.en},
            },
        )
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(
            status_code=401,
            detail={
                "code": INVALID_TOKEN.code,
                "message": localize(INVALID_TOKEN, locale),
                "messages": {"ru": INVALID_TOKEN.ru, "en": INVALID_TOKEN.en},
            },
        )
    return uuid.UUID(sub)
