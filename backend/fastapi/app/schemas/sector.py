"""Validates Sector request and response data for the standalone FastAPI reference service.

Keep this module aligned with the active Express/React implementation when the parallel Python service is maintained.
"""
from pydantic import BaseModel, Field


class SectorBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)
    description: str | None = None


class SectorCreate(SectorBase):
    pass


class SectorUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class SectorRead(SectorBase):
    id: int

    model_config = {"from_attributes": True}
