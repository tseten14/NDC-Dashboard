"""Populate the development database with realistic climate data."""

import asyncio
import random
from datetime import date

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.models import (
    Base,
    Country,
    EmissionsTarget,
    GreenhouseGas,
    HistoricalEmissions,
    NDCSubmission,
    Sector,
)

DATABASE_URL = "sqlite+aiosqlite:///./ndc_explorer.db"

engine = create_async_engine(DATABASE_URL, poolclass=NullPool)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

COUNTRIES = [
    ("UGA", "UG", "Uganda", "Africa", True),
    ("KEN", "KE", "Kenya", "Africa", True),
    ("TZA", "TZ", "Tanzania", "Africa", True),
    ("ETH", "ET", "Ethiopia", "Africa", True),
    ("GHA", "GH", "Ghana", "Africa", True),
    ("NGA", "NG", "Nigeria", "Africa", True),
    ("ZAF", "ZA", "South Africa", "Africa", False),
    ("EGY", "EG", "Egypt", "Africa", False),
    ("MAR", "MA", "Morocco", "Africa", True),
    ("MOZ", "MZ", "Mozambique", "Africa", True),
    ("IND", "IN", "India", "Asia", True),
    ("BRA", "BR", "Brazil", "South America", True),
]

SECTORS = [
    ("Energy", "Electricity, heat, and fuel combustion"),
    ("Agriculture", "Enteric fermentation, rice cultivation, soil emissions"),
    ("LULUCF", "Land use, land-use change, and forestry"),
    ("Waste", "Solid waste, wastewater, and landfill gas"),
    ("Transport", "Road, rail, aviation, and shipping"),
]

GHGS = [
    ("CO2", "Carbon Dioxide", 1.0),
    ("CH4", "Methane", 27.9),
    ("N2O", "Nitrous Oxide", 273.0),
]


async def seed() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        # Insert GHGs
        ghg_objs: list[GreenhouseGas] = []
        for symbol, name, gwp in GHGS:
            g = GreenhouseGas(symbol=symbol, name=name, gwp_100=gwp)
            session.add(g)
            ghg_objs.append(g)

        # Insert Sectors
        sector_objs: list[Sector] = []
        for name, desc in SECTORS:
            s = Sector(name=name, description=desc)
            session.add(s)
            sector_objs.append(s)

        # Insert Countries
        country_objs: list[Country] = []
        for iso3, iso2, name, region, developing in COUNTRIES:
            c = Country(
                iso_code=iso3,
                iso_code_2=iso2,
                name=name,
                region=region,
                is_developing=developing,
            )
            session.add(c)
            country_objs.append(c)

        await session.flush()

        # Insert NDC submissions + targets per country
        ndc_objs: list[NDCSubmission] = []
        target_objs: list[EmissionsTarget] = []
        for country in country_objs:
            ndc = NDCSubmission(
                country_id=country.id,
                submission_date=date(random.randint(2015, 2022), random.randint(1, 12), 1),
                version="1.0",
                document_url=f"https://unfccc.int/sites/default/files/NDC_{country.iso_code}.pdf",
                unconditional_reduction_pct=round(random.uniform(10, 25), 1),
                conditional_reduction_pct=round(random.uniform(25, 55), 1),
                baseline_year=2010,
                target_year=2030,
            )
            session.add(ndc)
            ndc_objs.append(ndc)
            await session.flush()

            for sector in sector_objs:
                target = EmissionsTarget(
                    ndc_submission_id=ndc.id,
                    sector_id=sector.id,
                    baseline_year=2010,
                    target_year=2030,
                    reduction_pct=round(random.uniform(10, 40), 1),
                    absolute_goal_mtco2e=round(random.uniform(1, 50), 2),
                    is_conditional=random.choice([True, False]),
                )
                session.add(target)
                target_objs.append(target)

        await session.flush()

        # Insert 60 historical emissions records (5 per country for 3 years)
        he_count = 0
        for country in country_objs:
            for year in [2015, 2018, 2020]:
                for sector in random.sample(sector_objs, k=min(3, len(sector_objs))):
                    ghg = random.choice(ghg_objs)
                    he = HistoricalEmissions(
                        country_id=country.id,
                        sector_id=sector.id,
                        ghg_id=ghg.id,
                        year=year,
                        mtco2e=round(random.uniform(0.5, 120.0), 4),
                        data_source="Climate TRACE v7",
                    )
                    session.add(he)
                    he_count += 1

        await session.commit()
        print(
            f"Seeded: {len(country_objs)} countries, {len(sector_objs)} sectors, "
            f"{len(GHGS)} GHGs, {len(ndc_objs)} NDCs, {len(target_objs)} targets, "
            f"{he_count} emissions records."
        )


if __name__ == "__main__":
    asyncio.run(seed())
