"""CRUD tests for /api/v1/ndcs/ endpoints."""

import pytest
from httpx import AsyncClient

from app.models import Country


def ndc_payload(country_id: int, **overrides: object) -> dict:
    base = {
        "country_id": country_id,
        "submission_date": "2021-09-01",
        "version": "1.0",
        "document_url": "https://example.com/ndc.pdf",
        "unconditional_reduction_pct": 24.0,
        "conditional_reduction_pct": 40.0,
        "baseline_year": 2010,
        "target_year": 2030,
    }
    base.update(overrides)
    return base


@pytest.mark.asyncio
async def test_create_ndc(client: AsyncClient, country: Country) -> None:
    resp = await client.post("/api/v1/ndcs/", json=ndc_payload(country.id))
    assert resp.status_code == 201
    data = resp.json()
    assert data["country_id"] == country.id
    assert data["unconditional_reduction_pct"] == 24.0


@pytest.mark.asyncio
async def test_create_ndc_invalid_country(client: AsyncClient) -> None:
    resp = await client.post("/api/v1/ndcs/", json=ndc_payload(999999))
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_create_ndc_target_before_baseline_rejected(
    client: AsyncClient, country: Country
) -> None:
    resp = await client.post(
        "/api/v1/ndcs/",
        json=ndc_payload(country.id, baseline_year=2030, target_year=2025),
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_get_ndc(client: AsyncClient, country: Country) -> None:
    create = await client.post("/api/v1/ndcs/", json=ndc_payload(country.id))
    ndc_id = create.json()["id"]
    resp = await client.get(f"/api/v1/ndcs/{ndc_id}")
    assert resp.status_code == 200
    assert resp.json()["id"] == ndc_id


@pytest.mark.asyncio
async def test_get_ndc_not_found(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/ndcs/999999")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_list_ndcs(client: AsyncClient, country: Country) -> None:
    await client.post("/api/v1/ndcs/", json=ndc_payload(country.id))
    resp = await client.get("/api/v1/ndcs/", params={"country_id": country.id})
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


@pytest.mark.asyncio
async def test_update_ndc(client: AsyncClient, country: Country) -> None:
    create = await client.post("/api/v1/ndcs/", json=ndc_payload(country.id))
    ndc_id = create.json()["id"]
    resp = await client.patch(
        f"/api/v1/ndcs/{ndc_id}",
        json={"conditional_reduction_pct": 55.0},
    )
    assert resp.status_code == 200
    assert resp.json()["conditional_reduction_pct"] == 55.0


@pytest.mark.asyncio
async def test_delete_ndc(client: AsyncClient, country: Country) -> None:
    create = await client.post("/api/v1/ndcs/", json=ndc_payload(country.id))
    ndc_id = create.json()["id"]
    del_resp = await client.delete(f"/api/v1/ndcs/{ndc_id}")
    assert del_resp.status_code == 204
    get_resp = await client.get(f"/api/v1/ndcs/{ndc_id}")
    assert get_resp.status_code == 404
