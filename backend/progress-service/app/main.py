from fastapi import FastAPI

app = FastAPI(
    title="Progress Service",
    description="Прогресс, HP, рейтинг, статистика (заглушка до интеграции)",
    version="0.1.0",
    docs_url="/docs",
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "progress-service"}
