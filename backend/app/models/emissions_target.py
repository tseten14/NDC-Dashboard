from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .ndc_submission import NDCSubmission
    from .sector import Sector


class EmissionsTarget(Base):
    __tablename__ = "emissions_targets"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ndc_submission_id: Mapped[int] = mapped_column(
        ForeignKey("ndc_submissions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    sector_id: Mapped[int] = mapped_column(
        ForeignKey("sectors.id", ondelete="CASCADE"), nullable=False, index=True
    )
    baseline_year: Mapped[int] = mapped_column(nullable=False)
    target_year: Mapped[int] = mapped_column(nullable=False, index=True)
    reduction_pct: Mapped[float | None] = mapped_column(nullable=True)
    absolute_goal_mtco2e: Mapped[float | None] = mapped_column(nullable=True)
    is_conditional: Mapped[bool] = mapped_column(nullable=False, default=False)

    ndc_submission: Mapped[NDCSubmission] = relationship(back_populates="emissions_targets")
    sector: Mapped[Sector] = relationship(back_populates="emissions_targets")

    __table_args__ = (
        Index("ix_et_ndc_sector_year", "ndc_submission_id", "sector_id", "target_year"),
    )
