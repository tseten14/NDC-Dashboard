"""Shared async fixtures for the test suite."""

import asyncio
from collections.abc import AsyncGenerator
from datetime import date

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.db.session import get_db
from app.main import app
from app.models import (
    Base,
    Country,
    EmissionsTarget,
    GreenhouseGas,
    HistoricalEmissions,
    NDCSubmission,
    Sector,
)

TEST_DB_URL = "sqlite+aiosqlite:///./test_ndc.db"

test_engine = create_async_engine(TEST_DB_URL, poolclass=NullPool)


# Enable FK enforcement for every SQLite connection
@event.listens_for(test_engine.sync_engine, "connect")
def _set_sqlite_fk_pragma(dbapi_conn, _connection_record):  # type: ignore[misc]
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()
TestSessionLocal = async_sessionmaker(
    bind=test_engine, class_=AsyncSession, expire_on_commit=False, autoflush=False
)


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_database():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await test_engine.dispose()


@pytest_asyncio.fixture(autouse=True)
async def rollback_session():
    """Wrap each test in a transaction that gets rolled back."""
    async with test_engine.begin() as conn:
        session = AsyncSession(bind=conn, expire_on_commit=False)
        await session.begin_nested()

        async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
            try:
                yield session
            except Exception:
                await session.rollback()
                raise

        app.dependency_overrides[get_db] = override_get_db
        yield session
        await session.rollback()
        await session.close()
        app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def client(rollback_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac


# ── Pre-built fixtures ─────────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def db_session(rollback_session: AsyncSession) -> AsyncSession:
    return rollback_session


@pytest_asyncio.fixture
async def country(db_session: AsyncSession) -> Country:
    c = Country(
        iso_code="UGA", iso_code_2="UG", name="Uganda", region="Africa", is_developing=True
    )
    db_session.add(c)
    await db_session.flush()
    return c


@pytest_asyncio.fixture
async def country2(db_session: AsyncSession) -> Country:
    c = Country(
        iso_code="KEN", iso_code_2="KE", name="Kenya", region="Africa", is_developing=True
    )
    db_session.add(c)
    await db_session.flush()
    return c


@pytest_asyncio.fixture
async def sector(db_session: AsyncSession) -> Sector:
    s = Sector(name="Energy", description="Electricity and heat")
    db_session.add(s)
    await db_session.flush()
    return s


@pytest_asyncio.fixture
async def sector2(db_session: AsyncSession) -> Sector:
    s = Sector(name="Agriculture", description="Farming emissions")
    db_session.add(s)
    await db_session.flush()
    return s


@pytest_asyncio.fixture
async def ghg(db_session: AsyncSession) -> GreenhouseGas:
    g = GreenhouseGas(symbol="CO2", name="Carbon Dioxide", gwp_100=1.0)
    db_session.add(g)
    await db_session.flush()
    return g


@pytest_asyncio.fixture
async def ndc(db_session: AsyncSession, country: Country) -> NDCSubmission:
    n = NDCSubmission(
        country_id=country.id,
        submission_date=date(2021, 9, 1),
        version="1.0",
        document_url="https://example.com/ndc.pdf",
        unconditional_reduction_pct=24.0,
        conditional_reduction_pct=40.0,
        baseline_year=2010,
        target_year=2030,
    )
    db_session.add(n)
    await db_session.flush()
    return n


@pytest_asyncio.fixture
async def target(
    db_session: AsyncSession, ndc: NDCSubmission, sector: Sector
) -> EmissionsTarget:
    t = EmissionsTarget(
        ndc_submission_id=ndc.id,
        sector_id=sector.id,
        baseline_year=2010,
        target_year=2030,
        reduction_pct=24.0,
        absolute_goal_mtco2e=10.5,
        is_conditional=False,
    )
    db_session.add(t)
    await db_session.flush()
    return t


@pytest_asyncio.fixture
async def emission(
    db_session: AsyncSession, country: Country, sector: Sector, ghg: GreenhouseGas
) -> HistoricalEmissions:
    he = HistoricalEmissions(
        country_id=country.id,
        sector_id=sector.id,
        ghg_id=ghg.id,
        year=2018,
        mtco2e=42.5,
        data_source="Test",
    )
    db_session.add(he)
    await db_session.flush()
    return he
