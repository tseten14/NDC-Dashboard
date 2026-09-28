"""Defines the Base database model used by the standalone FastAPI reference service.

Keep this module aligned with the active Express/React implementation when the parallel Python service is maintained.
"""
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass
