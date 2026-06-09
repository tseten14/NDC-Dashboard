"""Tests for the complex aggregation analytics endpoints."""

from datetime import date

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Country,
    EmissionsTarget,
    GreenhouseGas,
    HistoricalEmissions,
    NDCSubmission,
    Sector,
)


@pytest.mark.asyncio
async def test_emissions_country_not_found(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/analytics/emissions/", params={"iso_code": "ZZZ"})
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_emissions_empty_for_new_country(
    client: AsyncClient, country: Country
) -> None:
    resp = await client.get("/api/v1/analytics/emissions/", params={"iso_code": "UGA"})
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_emissions_aggregated_by_sector_year(
    client: AsyncClient,
    db_session: AsyncSession,
    country: Country,
    sector: Sector,
    sector2: Sector,
    ghg: GreenhouseGas,
) -> None:
    # Insert two emission records for same country+sector+year
    he1 = HistoricalEmissions(
        country_id=country.id, sector_id=sector.id, ghg_id=ghg.id,
        year=2018, mtco2e=10.0, data_source="test"
    )
    he2 = HistoricalEmissions(
        country_id=country.id, sector_id=sector.id, ghg_id=ghg.id,
        year=2018, mtco2e=5.0, data_source="test"
    )
    he3 = HistoricalEmissions(
        country_id=country.id, sector_id=sector2.id, ghg_id=ghg.id,
        year=2018, mtco2e=20.0, data_source="test"
    )
    db_session.add_all([he1, he2, he3])
    await db_session.flush()

    resp = await client.get("/api/v1/analytics/emissions/", params={"iso_code": "UGA"})
    assert resp.status_code == 200
    data = resp.json()

    # Verify aggregation: Energy = 15.0
    energy_row = next((r for r in data if r["sector"] == "Energy" and r["year"] == 2018), None)
    assert energy_row is not None
    assert abs(energy_row["total_mtco2e"] - 15.0) < 0.001

    # Verify Agriculture = 20.0
    agri_row = next((r for r in data if r["sector"] == "Agriculture" and r["year"] == 2018), None)
    assert agri_row is not None
    assert abs(agri_row["total_mtco2e"] - 20.0) < 0.001


@pytest.mark.asyncio
async def test_emissions_multi_year_grouping(
    client: AsyncClient,
    db_session: AsyncSession,
    country: Country,
    sector: Sector,
    ghg: GreenhouseGas,
) -> None:
    for yr, val in [(2015, 30.0), (2018, 50.0), (2020, 70.0)]:
        db_session.add(HistoricalEmissions(
            country_id=country.id, sector_id=sector.id, ghg_id=ghg.id,
            year=yr, mtco2e=val, data_source="test"
        ))
    await db_session.flush()

    resp = await client.get("/api/v1/analytics/emissions/", params={"iso_code": "UGA"})
    assert resp.status_code == 200
    years_returned = {r["year"] for r in resp.json()}
    assert {2015, 2018, 2020}.issubset(years_returned)


@pytest.mark.asyncio
async def test_emissions_iso_case_insensitive(
    client: AsyncClient, country: Country
) -> None:
    resp = await client.get("/api/v1/analytics/emissions/", params={"iso_code": "uga"})
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_target_comparison_empty_region(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/analytics/targets/", params={"region": "Nonexistent"})
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_target_comparison_by_region(
    client: AsyncClient,
    db_session: AsyncSession,
    country: Country,
    country2: Country,
    sector: Sector,
    ndc: NDCSubmission,
) -> None:
    # Add NDC for country2 (Kenya, also Africa)
    ndc2 = NDCSubmission(
        country_id=country2.id,
        submission_date=date(2021, 10, 1),
        baseline_year=2010,
        target_year=2030,
        unconditional_reduction_pct=15.0,
        conditional_reduction_pct=35.0,
    )
    db_session.add(ndc2)
    await db_session.flush()

    # Add targets for both NDCs
    t1 = EmissionsTarget(
        ndc_submission_id=ndc.id, sector_id=sector.id,
        baseline_year=2010, target_year=2030, reduction_pct=24.0, is_conditional=False
    )
    t2 = EmissionsTarget(
        ndc_submission_id=ndc2.id, sector_id=sector.id,
        baseline_year=2010, target_year=2030, reduction_pct=15.0, is_conditional=False
    )
    db_session.add_all([t1, t2])
    await db_session.flush()

    resp = await client.get("/api/v1/analytics/targets/", params={"region": "Africa"})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 2

    # Both countries in Africa should appear
    iso_codes = {r["iso_code"] for r in data}
    assert "UGA" in iso_codes
    assert "KEN" in iso_codes


@pytest.mark.asyncio
async def test_target_comparison_unconditional_vs_conditional(
    client: AsyncClient,
    db_session: AsyncSession,
    country: Country,
    sector: Sector,
    ndc: NDCSubmission,
) -> None:
    t = EmissionsTarget(
        ndc_submission_id=ndc.id, sector_id=sector.id,
        baseline_year=2010, target_year=2030, reduction_pct=24.0, is_conditional=False
    )
    db_session.add(t)
    await db_session.flush()

    resp = await client.get("/api/v1/analytics/targets/", params={"region": "Africa"})
    assert resp.status_code == 200
    item = next(r for r in resp.json() if r["iso_code"] == "UGA")
    assert item["unconditional_pct"] == 24.0
    assert item["conditional_pct"] == 40.0


@pytest.mark.asyncio
async def test_health_endpoint(client: AsyncClient) -> None:
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}
