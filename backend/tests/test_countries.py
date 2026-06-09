"""CRUD tests for /api/v1/countries/ endpoints."""

import pytest
from httpx import AsyncClient



@pytest.mark.asyncio
async def test_list_countries_empty(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/countries/")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_create_country(client: AsyncClient) -> None:
    payload = {
        "iso_code": "UGA",
        "iso_code_2": "UG",
        "name": "Uganda",
        "region": "Africa",
        "is_developing": True,
    }
    resp = await client.post("/api/v1/countries/", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["iso_code"] == "UGA"
    assert data["id"] is not None


@pytest.mark.asyncio
async def test_create_country_duplicate_iso(client: AsyncClient) -> None:
    payload = {
        "iso_code": "KEN",
        "iso_code_2": "KE",
        "name": "Kenya",
        "region": "Africa",
        "is_developing": True,
    }
    await client.post("/api/v1/countries/", json=payload)
    resp2 = await client.post("/api/v1/countries/", json=payload)
    assert resp2.status_code == 409


@pytest.mark.asyncio
async def test_create_country_invalid_iso(client: AsyncClient) -> None:
    payload = {
        "iso_code": "ugand",  # too long / lowercase
        "iso_code_2": "UG",
        "name": "Uganda",
        "region": "Africa",
        "is_developing": True,
    }
    resp = await client.post("/api/v1/countries/", json=payload)
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_get_country(client: AsyncClient) -> None:
    create = await client.post(
        "/api/v1/countries/",
        json={"iso_code": "TZA", "iso_code_2": "TZ", "name": "Tanzania", "region": "Africa", "is_developing": True},
    )
    country_id = create.json()["id"]
    resp = await client.get(f"/api/v1/countries/{country_id}")
    assert resp.status_code == 200
    assert resp.json()["iso_code"] == "TZA"


@pytest.mark.asyncio
async def test_get_country_not_found(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/countries/999999")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_country(client: AsyncClient) -> None:
    create = await client.post(
        "/api/v1/countries/",
        json={"iso_code": "ETH", "iso_code_2": "ET", "name": "Ethiopia", "region": "Africa", "is_developing": True},
    )
    cid = create.json()["id"]
    resp = await client.patch(f"/api/v1/countries/{cid}", json={"region": "East Africa"})
    assert resp.status_code == 200
    assert resp.json()["region"] == "East Africa"


@pytest.mark.asyncio
async def test_update_country_not_found(client: AsyncClient) -> None:
    resp = await client.patch("/api/v1/countries/999999", json={"name": "Ghost"})
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_country(client: AsyncClient) -> None:
    create = await client.post(
        "/api/v1/countries/",
        json={"iso_code": "GHA", "iso_code_2": "GH", "name": "Ghana", "region": "Africa", "is_developing": True},
    )
    cid = create.json()["id"]
    resp = await client.delete(f"/api/v1/countries/{cid}")
    assert resp.status_code == 204
    resp2 = await client.get(f"/api/v1/countries/{cid}")
    assert resp2.status_code == 404


@pytest.mark.asyncio
async def test_delete_country_not_found(client: AsyncClient) -> None:
    resp = await client.delete("/api/v1/countries/999999")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_list_countries_returns_created(client: AsyncClient) -> None:
    await client.post(
        "/api/v1/countries/",
        json={"iso_code": "NGA", "iso_code_2": "NG", "name": "Nigeria", "region": "Africa", "is_developing": True},
    )
    resp = await client.get("/api/v1/countries/")
    assert resp.status_code == 200
    isos = [c["iso_code"] for c in resp.json()]
    assert "NGA" in isos
