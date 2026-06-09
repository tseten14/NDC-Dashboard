from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .country import Country
    from .greenhouse_gas import GreenhouseGas
    from .sector import Sector


class HistoricalEmissions(Base):
    __tablename__ = "historical_emissions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    country_id: Mapped[int] = mapped_column(
        ForeignKey("countries.id", ondelete="CASCADE"), nullable=False, index=True
    )
    sector_id: Mapped[int] = mapped_column(
        ForeignKey("sectors.id", ondelete="CASCADE"), nullable=False, index=True
    )
    ghg_id: Mapped[int] = mapped_column(
        ForeignKey("greenhouse_gases.id", ondelete="CASCADE"), nullable=False, index=True
    )
    year: Mapped[int] = mapped_column(nullable=False, index=True)
    mtco2e: Mapped[float] = mapped_column(nullable=False)
    data_source: Mapped[str | None] = mapped_column(nullable=True)

    country: Mapped[Country] = relationship(back_populates="historical_emissions")
    sector: Mapped[Sector] = relationship(back_populates="historical_emissions")
    ghg: Mapped[GreenhouseGas] = relationship(back_populates="historical_emissions")

    __table_args__ = (
        Index("ix_he_country_sector_year", "country_id", "sector_id", "year"),
        Index("ix_he_country_year", "country_id", "year"),
    )
