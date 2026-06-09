from fastapi import APIRouter

from .analytics import router as analytics_router
from .countries import router as countries_router
from .ndcs import router as ndcs_router
from .targets import router as targets_router

api_router = APIRouter()
api_router.include_router(countries_router)
api_router.include_router(ndcs_router)
api_router.include_router(targets_router)
api_router.include_router(analytics_router)
