from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.country import Country
from app.schemas.country import CountryCreate, CountryRead, CountryUpdate

router = APIRouter(prefix="/countries", tags=["countries"])


@router.get("/", response_model=list[CountryRead])
async def list_countries(
    skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)
) -> list[Country]:
    result = await db.execute(select(Country).offset(skip).limit(limit))
    return list(result.scalars().all())


@router.get("/{country_id}", response_model=CountryRead)
async def get_country(country_id: int, db: AsyncSession = Depends(get_db)) -> Country:
    row = await db.get(Country, country_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Country not found")
    return row


@router.post("/", response_model=CountryRead, status_code=status.HTTP_201_CREATED)
async def create_country(payload: CountryCreate, db: AsyncSession = Depends(get_db)) -> Country:
    existing = await db.execute(
        select(Country).where(Country.iso_code == payload.iso_code)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="ISO code already exists")
    obj = Country(**payload.model_dump())
    db.add(obj)
    await db.flush()
    await db.refresh(obj)
    return obj


@router.patch("/{country_id}", response_model=CountryRead)
async def update_country(
    country_id: int, payload: CountryUpdate, db: AsyncSession = Depends(get_db)
) -> Country:
    row = await db.get(Country, country_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Country not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, field, value)
    await db.flush()
    await db.refresh(row)
    return row


@router.delete("/{country_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_country(country_id: int, db: AsyncSession = Depends(get_db)) -> None:
    row = await db.get(Country, country_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Country not found")
    await db.delete(row)
    await db.flush()
