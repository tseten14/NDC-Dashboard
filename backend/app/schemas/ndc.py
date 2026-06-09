from datetime import date
from pydantic import BaseModel, Field, model_validator


class NDCBase(BaseModel):
    country_id: int
    submission_date: date
    version: str = "1.0"
    document_url: str | None = None
    unconditional_reduction_pct: float | None = Field(default=None, ge=0, le=100)
    conditional_reduction_pct: float | None = Field(default=None, ge=0, le=100)
    baseline_year: int = Field(..., ge=1990, le=2030)
    target_year: int = Field(..., ge=2020, le=2100)

    @model_validator(mode="after")
    def target_after_baseline(self) -> "NDCBase":
        if self.target_year <= self.baseline_year:
            raise ValueError("target_year must be after baseline_year")
        return self


class NDCCreate(NDCBase):
    pass


class NDCUpdate(BaseModel):
    document_url: str | None = None
    unconditional_reduction_pct: float | None = None
    conditional_reduction_pct: float | None = None


class NDCRead(NDCBase):
    id: int

    model_config = {"from_attributes": True}
