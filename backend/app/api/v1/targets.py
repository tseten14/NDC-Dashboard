from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.emissions_target import EmissionsTarget
from app.models.ndc_submission import NDCSubmission
from app.models.sector import Sector
from app.schemas.target import TargetCreate, TargetRead, TargetUpdate

router = APIRouter(prefix="/targets", tags=["targets"])


@router.get("/", response_model=list[TargetRead])
async def list_targets(
    ndc_id: int | None = None,
    sector_id: int | None = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
) -> list[EmissionsTarget]:
    q = select(EmissionsTarget)
    if ndc_id is not None:
        q = q.where(EmissionsTarget.ndc_submission_id == ndc_id)
    if sector_id is not None:
        q = q.where(EmissionsTarget.sector_id == sector_id)
    result = await db.execute(q.offset(skip).limit(limit))
    return list(result.scalars().all())


@router.get("/{target_id}", response_model=TargetRead)
async def get_target(target_id: int, db: AsyncSession = Depends(get_db)) -> EmissionsTarget:
    row = await db.get(EmissionsTarget, target_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target not found")
    return row


@router.post("/", response_model=TargetRead, status_code=status.HTTP_201_CREATED)
async def create_target(
    payload: TargetCreate, db: AsyncSession = Depends(get_db)
) -> EmissionsTarget:
    ndc = await db.get(NDCSubmission, payload.ndc_submission_id)
    if not ndc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="NDC not found")
    sector = await db.get(Sector, payload.sector_id)
    if not sector:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sector not found")
    obj = EmissionsTarget(**payload.model_dump())
    db.add(obj)
    await db.flush()
    await db.refresh(obj)
    return obj


@router.patch("/{target_id}", response_model=TargetRead)
async def update_target(
    target_id: int, payload: TargetUpdate, db: AsyncSession = Depends(get_db)
) -> EmissionsTarget:
    row = await db.get(EmissionsTarget, target_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, field, value)
    await db.flush()
    await db.refresh(row)
    return row


@router.delete("/{target_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_target(target_id: int, db: AsyncSession = Depends(get_db)) -> None:
    row = await db.get(EmissionsTarget, target_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target not found")
    await db.delete(row)
    await db.flush()
