-- Climate TRACE seeded emissions (national, MtCO₂e from co2e_100yr)

CREATE TABLE IF NOT EXISTS public.climatetrace_emissions (
  id           SERIAL PRIMARY KEY,
  country      VARCHAR(10)    NOT NULL,
  year         INTEGER        NOT NULL,
  sector       VARCHAR(50)    NOT NULL,
  co2e_mtco2e  DECIMAL(10,2),
  source       VARCHAR(100)   DEFAULT 'climatetrace_api_v6',
  created_at   TIMESTAMPTZ    DEFAULT NOW(),
  UNIQUE (country, year, sector)
);

CREATE INDEX IF NOT EXISTS idx_climatetrace_emissions_lookup
  ON public.climatetrace_emissions (country, sector, year);

ALTER TABLE public.climatetrace_emissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read climatetrace_emissions"
  ON public.climatetrace_emissions
  FOR SELECT
  USING (true);

COMMENT ON TABLE public.climatetrace_emissions IS 'Seeded from Climate TRACE v6 API; values in MtCO₂e (co2e_100yr / 1e6).';
