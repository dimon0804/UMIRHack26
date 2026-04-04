import uuid

from jose import JWTError, jwt

from app.core.config import settings


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])


def parse_user_from_token(token: str) -> tuple[uuid.UUID, str]:
    try:
        payload = decode_access_token(token)
    except JWTError as e:
        raise ValueError("invalid_token") from e
    sub = payload.get("sub")
    email = (payload.get("email") or "").strip().lower()
    if not sub:
        raise ValueError("missing_sub")
    try:
        uid = uuid.UUID(str(sub))
    except ValueError as e:
        raise ValueError("bad_sub") from e
    if not email:
        raise ValueError("missing_email")
    return uid, email
