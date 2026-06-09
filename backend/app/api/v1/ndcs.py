from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.country import Country
from app.models.ndc_submission import NDCSubmission
from app.schemas.ndc import NDCCreate, NDCRead, NDCUpdate

router = APIRouter(prefix="/ndcs", tags=["ndcs"])


@router.get("/", response_model=list[NDCRead])
async def list_ndcs(
    country_id: int | None = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
) -> list[NDCSubmission]:
    q = select(NDCSubmission)
    if country_id is not None:
        q = q.where(NDCSubmission.country_id == country_id)
    result = await db.execute(q.offset(skip).limit(limit))
    return list(result.scalars().all())


@router.get("/{ndc_id}", response_model=NDCRead)
async def get_ndc(ndc_id: int, db: AsyncSession = Depends(get_db)) -> NDCSubmission:
    row = await db.get(NDCSubmission, ndc_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="NDC not found")
    return row


@router.post("/", response_model=NDCRead, status_code=status.HTTP_201_CREATED)
async def create_ndc(payload: NDCCreate, db: AsyncSession = Depends(get_db)) -> NDCSubmission:
    country = await db.get(Country, payload.country_id)
    if not country:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Country not found")
    obj = NDCSubmission(**payload.model_dump())
    db.add(obj)
    await db.flush()
    await db.refresh(obj)
    return obj


@router.patch("/{ndc_id}", response_model=NDCRead)
async def update_ndc(
    ndc_id: int, payload: NDCUpdate, db: AsyncSession = Depends(get_db)
) -> NDCSubmission:
    row = await db.get(NDCSubmission, ndc_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="NDC not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, field, value)
    await db.flush()
    await db.refresh(row)
    return row


@router.delete("/{ndc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ndc(ndc_id: int, db: AsyncSession = Depends(get_db)) -> None:
    row = await db.get(NDCSubmission, ndc_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="NDC not found")
    await db.delete(row)
    await db.flush()
