"""Marks this FastAPI directory as an importable package and defines its place in the parallel Python service.

Keep this module aligned with the active Express/React implementation when the parallel Python service is maintained.
"""
from .base import Base
from .country import Country
from .sector import Sector
from .greenhouse_gas import GreenhouseGas
from .ndc_submission import NDCSubmission
from .emissions_target import EmissionsTarget
from .historical_emissions import HistoricalEmissions

__all__ = [
    "Base",
    "Country",
    "Sector",
    "GreenhouseGas",
    "NDCSubmission",
    "EmissionsTarget",
    "HistoricalEmissions",
]
