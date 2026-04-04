import uuid
from typing import Annotated

from fastapi import Depends, Header, HTTPException

from app.core.security import parse_user_from_token


async def bearer_user(
    authorization: Annotated[str | None, Header()] = None,
) -> tuple[uuid.UUID, str]:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="missing_bearer")
    token = authorization[7:].strip()
    if not token:
        raise HTTPException(status_code=401, detail="empty_token")
    try:
        return parse_user_from_token(token)
    except ValueError:
        raise HTTPException(status_code=401, detail="invalid_token") from None


CurrentUser = Annotated[tuple[uuid.UUID, str], Depends(bearer_user)]
