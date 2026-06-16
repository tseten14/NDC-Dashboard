from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .historical_emissions import HistoricalEmissions
    from .ndc_submission import NDCSubmission


class Country(Base):
    __tablename__ = "countries"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    iso_code: Mapped[str] = mapped_column(String(3), unique=True, nullable=False, index=True)
    iso_code_2: Mapped[str] = mapped_column(String(2), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    region: Mapped[str] = mapped_column(String(80), nullable=False)
    is_developing: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    ndc_submissions: Mapped[list[NDCSubmission]] = relationship(
        back_populates="country", cascade="all, delete-orphan"
    )
    historical_emissions: Mapped[list[HistoricalEmissions]] = relationship(
        back_populates="country", cascade="all, delete-orphan"
    )

    __table_args__ = (Index("ix_countries_region", "region"),)
