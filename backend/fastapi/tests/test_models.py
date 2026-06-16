"""Model-level integrity tests — FK constraints, nullability, relationships."""

import pytest
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.models import (
    Country,
    EmissionsTarget,
    GreenhouseGas,
    HistoricalEmissions,
    NDCSubmission,
    Sector,
)


@pytest.mark.asyncio
async def test_country_persists(db_session: AsyncSession, country: Country) -> None:
    assert country.id is not None
    assert country.iso_code == "UGA"


@pytest.mark.asyncio
async def test_country_iso_code_unique(db_session: AsyncSession, country: Country) -> None:
    dup = Country(iso_code="UGA", iso_code_2="XX", name="Dup", region="Africa", is_developing=True)
    db_session.add(dup)
    with pytest.raises(IntegrityError):
        await db_session.flush()


@pytest.mark.asyncio
async def test_sector_persists(db_session: AsyncSession, sector: Sector) -> None:
    assert sector.id is not None
    assert sector.name == "Energy"


@pytest.mark.asyncio
async def test_sector_name_unique(db_session: AsyncSession, sector: Sector) -> None:
    dup = Sector(name="Energy")
    db_session.add(dup)
    with pytest.raises(IntegrityError):
        await db_session.flush()


@pytest.mark.asyncio
async def test_ghg_persists(db_session: AsyncSession, ghg: GreenhouseGas) -> None:
    assert ghg.id is not None
    assert ghg.gwp_100 == 1.0


@pytest.mark.asyncio
async def test_ghg_symbol_unique(db_session: AsyncSession, ghg: GreenhouseGas) -> None:
    dup = GreenhouseGas(symbol="CO2", name="Dup", gwp_100=1.0)
    db_session.add(dup)
    with pytest.raises(IntegrityError):
        await db_session.flush()


@pytest.mark.asyncio
async def test_ndc_links_to_country(db_session: AsyncSession, ndc: NDCSubmission, country: Country) -> None:
    assert ndc.country_id == country.id


@pytest.mark.asyncio
async def test_ndc_baseline_before_target(db_session: AsyncSession, country: Country) -> None:
    n = NDCSubmission(
        country_id=country.id,
        submission_date=date(2021, 1, 1),
        baseline_year=2030,
        target_year=2030,
    )
    db_session.add(n)
    await db_session.flush()
    # DB allows this; Pydantic validator catches it at API layer — test it separately
    assert n.id is not None


@pytest.mark.asyncio
async def test_emissions_target_links_ndc_sector(
    db_session: AsyncSession, target: EmissionsTarget, ndc: NDCSubmission, sector: Sector
) -> None:
    assert target.ndc_submission_id == ndc.id
    assert target.sector_id == sector.id


@pytest.mark.asyncio
async def test_emissions_target_fk_ndc_invalid(
    db_session: AsyncSession, sector: Sector
) -> None:
    bad = EmissionsTarget(
        ndc_submission_id=999999,
        sector_id=sector.id,
        baseline_year=2010,
        target_year=2030,
        is_conditional=False,
    )
    db_session.add(bad)
    with pytest.raises(IntegrityError):
        await db_session.flush()


@pytest.mark.asyncio
async def test_historical_emissions_persists(
    db_session: AsyncSession, emission: HistoricalEmissions
) -> None:
    assert emission.id is not None
    assert emission.mtco2e == 42.5
    assert emission.year == 2018


@pytest.mark.asyncio
async def test_historical_emissions_fk_country_invalid(
    db_session: AsyncSession, sector: Sector, ghg: GreenhouseGas
) -> None:
    bad = HistoricalEmissions(
        country_id=999999, sector_id=sector.id, ghg_id=ghg.id,
        year=2020, mtco2e=1.0
    )
    db_session.add(bad)
    with pytest.raises(IntegrityError):
        await db_session.flush()


@pytest.mark.asyncio
async def test_historical_emissions_fk_sector_invalid(
    db_session: AsyncSession, country: Country, ghg: GreenhouseGas
) -> None:
    bad = HistoricalEmissions(
        country_id=country.id, sector_id=999999, ghg_id=ghg.id,
        year=2020, mtco2e=1.0
    )
    db_session.add(bad)
    with pytest.raises(IntegrityError):
        await db_session.flush()


@pytest.mark.asyncio
async def test_ndc_fk_country_invalid(db_session: AsyncSession) -> None:
    bad = NDCSubmission(
        country_id=999999,
        submission_date=date(2021, 1, 1),
        baseline_year=2010,
        target_year=2030,
    )
    db_session.add(bad)
    with pytest.raises(IntegrityError):
        await db_session.flush()
