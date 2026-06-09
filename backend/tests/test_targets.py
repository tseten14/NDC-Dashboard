"""CRUD tests for /api/v1/targets/ endpoints."""

import pytest
from httpx import AsyncClient

from app.models import NDCSubmission, Sector


def target_payload(ndc_id: int, sector_id: int, **overrides: object) -> dict:
    base = {
        "ndc_submission_id": ndc_id,
        "sector_id": sector_id,
        "baseline_year": 2010,
        "target_year": 2030,
        "reduction_pct": 24.0,
        "absolute_goal_mtco2e": 10.5,
        "is_conditional": False,
    }
    base.update(overrides)
    return base


@pytest.mark.asyncio
async def test_create_target(
    client: AsyncClient, ndc: NDCSubmission, sector: Sector
) -> None:
    resp = await client.post("/api/v1/targets/", json=target_payload(ndc.id, sector.id))
    assert resp.status_code == 201
    data = resp.json()
    assert data["ndc_submission_id"] == ndc.id
    assert data["reduction_pct"] == 24.0


@pytest.mark.asyncio
async def test_create_target_invalid_ndc(client: AsyncClient, sector: Sector) -> None:
    resp = await client.post("/api/v1/targets/", json=target_payload(999999, sector.id))
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_create_target_invalid_sector(
    client: AsyncClient, ndc: NDCSubmission
) -> None:
    resp = await client.post("/api/v1/targets/", json=target_payload(ndc.id, 999999))
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_target(
    client: AsyncClient, ndc: NDCSubmission, sector: Sector
) -> None:
    create = await client.post("/api/v1/targets/", json=target_payload(ndc.id, sector.id))
    tid = create.json()["id"]
    resp = await client.get(f"/api/v1/targets/{tid}")
    assert resp.status_code == 200
    assert resp.json()["id"] == tid


@pytest.mark.asyncio
async def test_get_target_not_found(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/targets/999999")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_list_targets_by_ndc(
    client: AsyncClient, ndc: NDCSubmission, sector: Sector
) -> None:
    await client.post("/api/v1/targets/", json=target_payload(ndc.id, sector.id))
    resp = await client.get("/api/v1/targets/", params={"ndc_id": ndc.id})
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


@pytest.mark.asyncio
async def test_update_target(
    client: AsyncClient, ndc: NDCSubmission, sector: Sector
) -> None:
    create = await client.post("/api/v1/targets/", json=target_payload(ndc.id, sector.id))
    tid = create.json()["id"]
    resp = await client.patch(f"/api/v1/targets/{tid}", json={"reduction_pct": 35.0})
    assert resp.status_code == 200
    assert resp.json()["reduction_pct"] == 35.0


@pytest.mark.asyncio
async def test_delete_target(
    client: AsyncClient, ndc: NDCSubmission, sector: Sector
) -> None:
    create = await client.post("/api/v1/targets/", json=target_payload(ndc.id, sector.id))
    tid = create.json()["id"]
    del_resp = await client.delete(f"/api/v1/targets/{tid}")
    assert del_resp.status_code == 204
    get_resp = await client.get(f"/api/v1/targets/{tid}")
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_target_reduction_pct_range_validation(
    client: AsyncClient, ndc: NDCSubmission, sector: Sector
) -> None:
    resp = await client.post(
        "/api/v1/targets/",
        json=target_payload(ndc.id, sector.id, reduction_pct=150.0),
    )
    assert resp.status_code == 422
