from fastapi import FastAPI

from app.api.v1.ai import router as ai_router


def create_app() -> FastAPI:
    app = FastAPI(
        title="Cyber Sim AI Service",
        description="Mistral: чат для SOC-наставника и расширений симулятора",
        version="0.1.0",
        docs_url="/docs",
        openapi_url="/openapi.json",
    )

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok", "service": "ai-service"}

    # Пути /chat и /llm-config с корня: gateway проксирует /api/v1/ai/{path} → {base}/{path}
    app.include_router(ai_router, tags=["ai"])
    return app


app = create_app()
