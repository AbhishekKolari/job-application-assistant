from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel

from app.core.config import get_settings
from app.models import models  # noqa: F401

settings = get_settings()

engine = create_async_engine(
    settings.DATABASE_URL.replace("postgresql+psycopg", "postgresql+asyncpg"),
    echo=settings.LOG_LEVEL.upper() == "DEBUG",
)

async_session_factory = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)


async def get_session() -> AsyncSession:
    async with async_session_factory() as session:
        yield session
