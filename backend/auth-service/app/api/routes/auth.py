import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user_id
from app.core.exceptions import AppError, LocalizedMessage
from app.core.i18n import localize, pick_locale
from app.db.session import get_db
from app.repositories.user_repository import UserRepository
from app.schemas.auth import LoginRequest, MeResponse, RefreshRequest, RegisterRequest, TokenPairResponse, UserPublic
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])

NOT_FOUND = LocalizedMessage(
    code="auth.user_not_found",
    ru="Пользователь не найден",
    en="User not found",
)


def _svc(session: AsyncSession) -> AuthService:
    return AuthService(session)


def _app_error_response(request: Request, e: AppError) -> HTTPException:
    locale = pick_locale(request)
    return HTTPException(
        status_code=e.status_code,
        detail={
            "code": e.message.code,
            "message": localize(e.message, locale),
            "messages": {"ru": e.message.ru, "en": e.message.en},
        },
    )


@router.post("/register", response_model=TokenPairResponse)
async def register(request: Request, body: RegisterRequest, session: AsyncSession = Depends(get_db)) -> TokenPairResponse:
    try:
        return await _svc(session).register(body)
    except AppError as e:
        raise _app_error_response(request, e) from e


@router.post("/login", response_model=TokenPairResponse)
async def login(request: Request, body: LoginRequest, session: AsyncSession = Depends(get_db)) -> TokenPairResponse:
    try:
        return await _svc(session).login(body)
    except AppError as e:
        raise _app_error_response(request, e) from e


@router.post("/refresh", response_model=TokenPairResponse)
async def refresh_token(
    request: Request, body: RefreshRequest, session: AsyncSession = Depends(get_db)
) -> TokenPairResponse:
    try:
        return await _svc(session).refresh(body.refresh_token)
    except AppError as e:
        raise _app_error_response(request, e) from e


@router.get("/me", response_model=MeResponse)
async def me(
    request: Request,
    user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db),
) -> MeResponse:
    repo = UserRepository(session)
    user = await repo.get_by_id(user_id)
    if not user:
        locale = pick_locale(request)
        raise HTTPException(
            status_code=404,
            detail={
                "code": NOT_FOUND.code,
                "message": localize(NOT_FOUND, locale),
                "messages": {"ru": NOT_FOUND.ru, "en": NOT_FOUND.en},
            },
        )
    return MeResponse(user=UserPublic.model_validate(user))
