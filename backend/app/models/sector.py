from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .emissions_target import EmissionsTarget
    from .historical_emissions import HistoricalEmissions


class Sector(Base):
    __tablename__ = "sectors"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(80), unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)

    emissions_targets: Mapped[list[EmissionsTarget]] = relationship(
        back_populates="sector", cascade="all, delete-orphan"
    )
    historical_emissions: Mapped[list[HistoricalEmissions]] = relationship(
        back_populates="sector", cascade="all, delete-orphan"
    )
