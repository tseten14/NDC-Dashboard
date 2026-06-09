from pydantic import BaseModel, Field


class EmissionsBase(BaseModel):
    country_id: int
    sector_id: int
    ghg_id: int
    year: int = Field(..., ge=1850, le=2100)
    mtco2e: float = Field(..., ge=0)
    data_source: str | None = None


class EmissionsCreate(EmissionsBase):
    pass


class EmissionsRead(EmissionsBase):
    id: int

    model_config = {"from_attributes": True}


class EmissionsBySectorYear(BaseModel):
    sector: str
    year: int
    total_mtco2e: float
