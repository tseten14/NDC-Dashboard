from pydantic import BaseModel


class EmissionsBySectorYear(BaseModel):
    sector: str
    year: int
    total_mtco2e: float


class TargetComparisonItem(BaseModel):
    country: str
    iso_code: str
    sector: str
    unconditional_pct: float | None
    conditional_pct: float | None
    target_year: int
