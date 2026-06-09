from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import settings

# SQLite uses NullPool; PostgreSQL (asyncpg) uses QueuePool (default)
_is_sqlite = settings.DATABASE_URL.startswith("sqlite")

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_pre_ping=True,
    # NullPool is required for SQLite in async; PostgreSQL uses QueuePool
    poolclass=NullPool if _is_sqlite else None,
    **({} if _is_sqlite else {
        "pool_size": settings.POOL_SIZE,
        "max_overflow": settings.MAX_OVERFLOW,
        "pool_timeout": settings.POOL_TIMEOUT,
        "connect_args": {
            "server_settings": {
                "statement_timeout": str(settings.STATEMENT_TIMEOUT_MS),
            }
        },
    }),
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
