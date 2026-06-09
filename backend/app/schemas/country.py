from pydantic import BaseModel, Field, field_validator


class CountryBase(BaseModel):
    iso_code: str = Field(..., min_length=3, max_length=3, pattern=r"^[A-Z]{3}$")
    iso_code_2: str = Field(..., min_length=2, max_length=2, pattern=r"^[A-Z]{2}$")
    name: str = Field(..., min_length=1, max_length=120)
    region: str = Field(..., min_length=1, max_length=80)
    is_developing: bool = True

    @field_validator("iso_code", "iso_code_2", mode="before")
    @classmethod
    def upper(cls, v: str) -> str:
        return v.strip().upper()


class CountryCreate(CountryBase):
    pass


class CountryUpdate(BaseModel):
    name: str | None = None
    region: str | None = None
    is_developing: bool | None = None


class CountryRead(CountryBase):
    id: int

    model_config = {"from_attributes": True}
