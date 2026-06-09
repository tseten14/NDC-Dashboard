from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .historical_emissions import HistoricalEmissions


class GreenhouseGas(Base):
    __tablename__ = "greenhouse_gases"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    symbol: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    gwp_100: Mapped[float] = mapped_column(nullable=False, default=1.0)

    historical_emissions: Mapped[list[HistoricalEmissions]] = relationship(
        back_populates="ghg", cascade="all, delete-orphan"
    )
