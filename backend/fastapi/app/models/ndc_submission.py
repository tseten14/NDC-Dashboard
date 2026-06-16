from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .country import Country
    from .emissions_target import EmissionsTarget


class NDCSubmission(Base):
    __tablename__ = "ndc_submissions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    country_id: Mapped[int] = mapped_column(
        ForeignKey("countries.id", ondelete="CASCADE"), nullable=False, index=True
    )
    submission_date: Mapped[date] = mapped_column(Date, nullable=False)
    version: Mapped[str] = mapped_column(String(20), nullable=False, default="1.0")
    document_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    unconditional_reduction_pct: Mapped[float | None] = mapped_column(nullable=True)
    conditional_reduction_pct: Mapped[float | None] = mapped_column(nullable=True)
    baseline_year: Mapped[int] = mapped_column(nullable=False)
    target_year: Mapped[int] = mapped_column(nullable=False, index=True)

    country: Mapped[Country] = relationship(back_populates="ndc_submissions")
    emissions_targets: Mapped[list[EmissionsTarget]] = relationship(
        back_populates="ndc_submission", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_ndc_country_target_year", "country_id", "target_year"),
    )
