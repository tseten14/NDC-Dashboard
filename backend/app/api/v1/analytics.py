from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.country import Country
from app.models.emissions_target import EmissionsTarget
from app.models.historical_emissions import HistoricalEmissions
from app.models.ndc_submission import NDCSubmission
from app.models.sector import Sector
from app.schemas.analytics import EmissionsBySectorYear, TargetComparisonItem

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get(
    "/emissions/",
    response_model=list[EmissionsBySectorYear],
    summary="Historical emissions grouped by sector and year for a country",
)
async def emissions_by_sector_year(
    iso_code: str = Query(..., description="3-letter ISO country code"),
    db: AsyncSession = Depends(get_db),
) -> list[EmissionsBySectorYear]:
    country_row = await db.execute(
        select(Country).where(Country.iso_code == iso_code.upper())
    )
    country = country_row.scalar_one_or_none()
    if not country:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Country not found")

    q = (
        select(
            Sector.name.label("sector"),
            HistoricalEmissions.year,
            func.sum(HistoricalEmissions.mtco2e).label("total_mtco2e"),
        )
        .join(Sector, HistoricalEmissions.sector_id == Sector.id)
        .where(HistoricalEmissions.country_id == country.id)
        .group_by(Sector.name, HistoricalEmissions.year)
        .order_by(HistoricalEmissions.year, Sector.name)
    )
    rows = await db.execute(q)
    return [
        EmissionsBySectorYear(sector=r.sector, year=r.year, total_mtco2e=float(r.total_mtco2e))
        for r in rows
    ]


@router.get(
    "/targets/",
    response_model=list[TargetComparisonItem],
    summary="Unconditional vs conditional target comparison across a region",
)
async def target_comparison_by_region(
    region: str = Query(..., description="Region name, e.g. 'Africa'"),
    db: AsyncSession = Depends(get_db),
) -> list[TargetComparisonItem]:
    q = (
        select(
            Country.name.label("country"),
            Country.iso_code,
            Sector.name.label("sector"),
            NDCSubmission.unconditional_reduction_pct,
            NDCSubmission.conditional_reduction_pct,
            EmissionsTarget.target_year,
        )
        .join(NDCSubmission, NDCSubmission.country_id == Country.id)
        .join(EmissionsTarget, EmissionsTarget.ndc_submission_id == NDCSubmission.id)
        .join(Sector, EmissionsTarget.sector_id == Sector.id)
        .where(Country.region == region)
        .order_by(Country.name, Sector.name)
    )
    rows = await db.execute(q)
    return [
        TargetComparisonItem(
            country=r.country,
            iso_code=r.iso_code,
            sector=r.sector,
            unconditional_pct=r.unconditional_reduction_pct,
            conditional_pct=r.conditional_reduction_pct,
            target_year=r.target_year,
        )
        for r in rows
    ]
