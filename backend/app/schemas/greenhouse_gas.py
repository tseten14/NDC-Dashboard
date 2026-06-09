from pydantic import BaseModel, Field


class GHGBase(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=20)
    name: str = Field(..., min_length=1, max_length=120)
    gwp_100: float = Field(default=1.0, gt=0)


class GHGCreate(GHGBase):
    pass


class GHGRead(GHGBase):
    id: int

    model_config = {"from_attributes": True}
