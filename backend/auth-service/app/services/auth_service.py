from datetime import UTC, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import AppError, LocalizedMessage
from app.core.security import (
    create_access_token,
    hash_password,
    hash_refresh_token,
    new_refresh_token_value,
    verify_password,
)
from app.repositories.token_repository import RefreshTokenRepository
from app.repositories.user_repository import UserRepository
from app.schemas.auth import LoginRequest, RegisterRequest, TokenPairResponse

EMAIL_TAKEN = LocalizedMessage(
    code="auth.email_taken",
    ru="Этот email уже зарегистрирован",
    en="This email is already registered",
)
INVALID_CREDENTIALS = LocalizedMessage(
    code="auth.invalid_credentials",
    ru="Неверный email или пароль",
    en="Invalid email or password",
)
INVALID_REFRESH = LocalizedMessage(
    code="auth.invalid_refresh",
    ru="Недействительный или просроченный refresh-токен",
    en="Invalid or expired refresh token",
)


class AuthService:
    def __init__(self, session: AsyncSession) -> None:
        self._users = UserRepository(session)
        self._tokens = RefreshTokenRepository(session)
        self._session = session

    async def register(self, body: RegisterRequest) -> TokenPairResponse:
        existing = await self._users.get_by_email(body.email)
        if existing:
            raise AppError(EMAIL_TAKEN, status_code=409)
        hashed = hash_password(body.password)
        user = await self._users.create(email=body.email, password_hash=hashed, locale=body.locale)
        return await self._issue_tokens(user.id, user.email)

    async def login(self, body: LoginRequest) -> TokenPairResponse:
        user = await self._users.get_by_email(body.email)
        if not user or not verify_password(body.password, user.password_hash):
            raise AppError(INVALID_CREDENTIALS, status_code=401)
        return await self._issue_tokens(user.id, user.email)

    async def refresh(self, raw_refresh: str) -> TokenPairResponse:
        th = hash_refresh_token(raw_refresh)
        row = await self._tokens.get_valid_by_hash(th)
        if not row:
            raise AppError(INVALID_REFRESH, status_code=401)
        user = await self._users.get_by_id(row.user_id)
        if not user:
            raise AppError(INVALID_REFRESH, status_code=401)
        await self._tokens.revoke(row.id)
        await self._session.commit()
        return await self._issue_tokens(user.id, user.email)

    async def _issue_tokens(self, user_id, email: str) -> TokenPairResponse:
        access = create_access_token(subject=str(user_id), email=email)
        raw_refresh = new_refresh_token_value()
        expires = datetime.now(UTC) + timedelta(days=settings.jwt_refresh_expire_days)
        await self._tokens.create(
            user_id=user_id,
            token_hash=hash_refresh_token(raw_refresh),
            expires_at=expires,
        )
        await self._session.commit()
        return TokenPairResponse(access_token=access, refresh_token=raw_refresh)
