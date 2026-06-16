from pydantic import BaseModel, Field


class TargetBase(BaseModel):
    ndc_submission_id: int
    sector_id: int
    baseline_year: int = Field(..., ge=1990, le=2030)
    target_year: int = Field(..., ge=2020, le=2100)
    reduction_pct: float | None = Field(default=None, ge=0, le=100)
    absolute_goal_mtco2e: float | None = Field(default=None, ge=0)
    is_conditional: bool = False


class TargetCreate(TargetBase):
    pass


class TargetUpdate(BaseModel):
    reduction_pct: float | None = None
    absolute_goal_mtco2e: float | None = None
    is_conditional: bool | None = None


class TargetRead(TargetBase):
    id: int

    model_config = {"from_attributes": True}
