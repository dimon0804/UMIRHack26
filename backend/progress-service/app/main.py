from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy import text

from app.api.routes.cipherline import router as cipherline_router
from app.api.routes.custom_simulation import router as custom_simulation_router
from app.api.routes.leaderboard import router as leaderboard_router
from app.core.config import settings
from app.db.session import engine
from app.models.custom_simulation import CustomSimulationCase  # noqa: F401
from app.models.game_state import Base


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(
    title="Progress Service",
    description="Прогресс Cipherline (HP, XP, модули, история) и публичный лидерборд в PostgreSQL",
    version="0.3.0",
    docs_url="/docs",
    lifespan=lifespan,
)

app.include_router(cipherline_router)
app.include_router(custom_simulation_router)
app.include_router(leaderboard_router)


@app.get("/health")
async def health() -> dict[str, str]:
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        db = "ok"
    except Exception:
        db = "error"
    return {"status": "ok", "service": "progress-service", "database": db}
