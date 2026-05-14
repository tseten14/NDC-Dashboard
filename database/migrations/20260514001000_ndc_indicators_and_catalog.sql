-- Non-emissions indicator time series (forest %, renewable %, modal %, CSA %) + cockpit catalog (activities, mitigation).
-- Seeded via: node scripts/seed_ndc_indicators_catalog.js

CREATE TABLE IF NOT EXISTS public.ndc_indicator_yearly (
  target_id   VARCHAR(8)  NOT NULL,
  year          INTEGER     NOT NULL,
  value         DECIMAL(14,4) NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (target_id, year)
);

CREATE TABLE IF NOT EXISTS public.ndc_indicator_meta (
  target_id           VARCHAR(8) PRIMARY KEY,
  baseline_year       INTEGER NOT NULL,
  baseline_value      DECIMAL(14,4) NOT NULL,
  target_year         INTEGER NOT NULL,
  target_value        DECIMAL(14,4) NOT NULL,
  unit                TEXT NOT NULL,
  data_providers      TEXT[] NOT NULL DEFAULT '{}',
  source_type         VARCHAR(40) NOT NULL DEFAULT 'reported',
  mrv_owner_ministry  TEXT NOT NULL DEFAULT '',
  qaqc_status         VARCHAR(20) NOT NULL DEFAULT 'ok',
  is_validated        BOOLEAN NOT NULL DEFAULT false,
  last_updated        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ndc_catalog_activities (
  id                  TEXT PRIMARY KEY,
  target_id           VARCHAR(8) NOT NULL,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  body                JSONB NOT NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ndc_catalog_activities_target ON public.ndc_catalog_activities (target_id);

CREATE TABLE IF NOT EXISTS public.ndc_catalog_mitigation (
  id                  TEXT PRIMARY KEY,
  target_id           VARCHAR(8) NOT NULL,
  sector_id           VARCHAR(32) NOT NULL,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  body                JSONB NOT NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ndc_catalog_mitigation_lookup
  ON public.ndc_catalog_mitigation (target_id, sector_id);

ALTER TABLE public.ndc_indicator_yearly ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ndc_indicator_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ndc_catalog_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ndc_catalog_mitigation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read ndc_indicator_yearly"
  ON public.ndc_indicator_yearly FOR SELECT USING (true);

CREATE POLICY "Allow public read ndc_indicator_meta"
  ON public.ndc_indicator_meta FOR SELECT USING (true);

CREATE POLICY "Allow public read ndc_catalog_activities"
  ON public.ndc_catalog_activities FOR SELECT USING (true);

CREATE POLICY "Allow public read ndc_catalog_mitigation"
  ON public.ndc_catalog_mitigation FOR SELECT USING (true);

COMMENT ON TABLE public.ndc_indicator_yearly IS 'Annual values for non-MtCO2e NDC targets (t2,t3,t5,t8); API-driven cockpit.';
COMMENT ON TABLE public.ndc_catalog_activities IS 'NDC activities/measures; replaces bundled demo when seeded.';
COMMENT ON TABLE public.ndc_catalog_mitigation IS 'Mitigation option cards; replaces bundled demo when seeded.';
