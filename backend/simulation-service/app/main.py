from fastapi import FastAPI

app = FastAPI(
    title="Simulation Service",
    description="Сценарии атак, проверка решений, последствия (заглушка до интеграции)",
    version="0.1.0",
    docs_url="/docs",
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "simulation-service"}
