from fastapi import FastAPI

from app.scenario_api import router as scenarios_router

app = FastAPI(
    title="Simulation Service",
    description="Сценарии тренажёра: почта, чат, проверка решений",
    version="0.2.0",
    docs_url="/docs",
)

app.include_router(scenarios_router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "simulation-service"}
