from fastapi import APIRouter

from app.core.config import settings
from app.schemas.ai import ChatRequest, ChatResponse
from app.schemas.scenario_gen import ScenarioGenerateRequest, ScenarioGenerateResponse
from app.schemas.track_gen import TrackGenerateRequest, TrackGenerateResponse
from app.services.mistral_client import MistralClient
from app.services.scenario_generator import generate_training_scenario
from app.services.track_generator import generate_training_track

router = APIRouter()
client = MistralClient()


@router.post("/chat", response_model=ChatResponse)
async def chat(body: ChatRequest) -> ChatResponse:
    """Чат с Mistral (La Plateforme или OpenAI-совместимый шлюз). Как в rnd-hack2026 ai-service."""
    return await client.chat(body)


@router.get("/llm-config")
def llm_config() -> dict:
    """Диагностика: режим и модель без ключа."""
    key = settings.mistral_api_key.strip()
    return {
        "llm_mode": settings.llm_mode,
        "base_url": settings.mistral_base_url.rstrip("/"),
        "chat_model": settings.mistral_chat_model,
        "api_key_configured": bool(key),
    }


@router.post("/generate-scenario", response_model=ScenarioGenerateResponse)
async def generate_scenario(body: ScenarioGenerateRequest) -> ScenarioGenerateResponse:
    """Mistral: один JSON-сценарий почты или чата для тренажёра (разнообразие без хардкода)."""
    return await generate_training_scenario(body)


@router.post("/generate-track", response_model=TrackGenerateResponse)
async def generate_track(body: TrackGenerateRequest) -> TrackGenerateResponse:
    """Mistral: трек из 3 шагов (ситуации, ответы, рекомендации) для экрана «Сценарии»."""
    return await generate_training_track(body)
