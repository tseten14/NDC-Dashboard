-- Enums for risk module
CREATE TYPE public.data_status AS ENUM ('Illustrative', 'Preliminary', 'Validated');
CREATE TYPE public.confidence_rating AS ENUM ('Low', 'Medium', 'High');
CREATE TYPE public.risk_level AS ENUM ('Low', 'Medium', 'High', 'Extreme');
CREATE TYPE public.acute_chronic AS ENUM ('Acute', 'Chronic');
CREATE TYPE public.data_access_mode AS ENUM ('Upload', 'API', 'Computed');

-- Hazard layers
CREATE TABLE public.hazard_layers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  hazard_type TEXT NOT NULL,
  acute_or_chronic public.acute_chronic NOT NULL DEFAULT 'Acute',
  scenario_name TEXT,
  time_horizon TEXT,
  spatial_resolution TEXT,
  geography_coverage TEXT,
  source_provider TEXT,
  source_url TEXT,
  license TEXT,
  vintage_date DATE,
  confidence_rating public.confidence_rating NOT NULL DEFAULT 'Low',
  uncertainty_notes TEXT,
  methodology_notes TEXT,
  data_status public.data_status NOT NULL DEFAULT 'Illustrative',
  data_access_mode public.data_access_mode NOT NULL DEFAULT 'Upload',
  api_endpoint TEXT,
  auth_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Exposure layers
CREATE TABLE public.exposure_layers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  exposure_type TEXT NOT NULL,
  geometry_type TEXT,
  source_provider TEXT,
  source_url TEXT,
  license TEXT,
  vintage_date DATE,
  confidence_rating public.confidence_rating NOT NULL DEFAULT 'Low',
  data_status public.data_status NOT NULL DEFAULT 'Illustrative',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vulnerability models
CREATE TABLE public.vulnerability_models (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  applies_to_exposure_type TEXT,
  applies_to_hazard_type TEXT,
  model_reference TEXT,
  source_provider TEXT,
  source_url TEXT,
  assumptions TEXT,
  uncertainty_notes TEXT,
  data_status public.data_status NOT NULL DEFAULT 'Illustrative',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Districts (placeholder Uganda boundaries for prototype)
CREATE TABLE public.risk_districts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  region TEXT,
  geojson JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Risk cells: per-district × per-hazard intensity scores
CREATE TABLE public.risk_cells (
  id TEXT PRIMARY KEY,
  district_id TEXT NOT NULL REFERENCES public.risk_districts(id) ON DELETE CASCADE,
  hazard_layer_id TEXT NOT NULL REFERENCES public.hazard_layers(id) ON DELETE CASCADE,
  intensity_score_0_100 INTEGER NOT NULL CHECK (intensity_score_0_100 BETWEEN 0 AND 100),
  risk_level public.risk_level NOT NULL DEFAULT 'Low',
  confidence public.confidence_rating NOT NULL DEFAULT 'Low',
  scenario TEXT,
  time_horizon TEXT,
  vintage DATE,
  source_provider TEXT,
  source_url TEXT,
  notes TEXT,
  data_status public.data_status NOT NULL DEFAULT 'Illustrative',
  related_ndc_targets TEXT[] DEFAULT '{}',
  related_activities UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (district_id, hazard_layer_id)
);

-- Composite risk assessments (hazard × exposure × vulnerability)
CREATE TABLE public.risk_assessments (
  id TEXT PRIMARY KEY,
  geography_unit TEXT NOT NULL,
  geography_id TEXT,
  hazard_layer_id TEXT REFERENCES public.hazard_layers(id) ON DELETE SET NULL,
  exposure_layer_id TEXT REFERENCES public.exposure_layers(id) ON DELETE SET NULL,
  vulnerability_model_id TEXT REFERENCES public.vulnerability_models(id) ON DELETE SET NULL,
  risk_score INTEGER CHECK (risk_score BETWEEN 0 AND 100),
  risk_level public.risk_level NOT NULL DEFAULT 'Low',
  confidence_rating public.confidence_rating NOT NULL DEFAULT 'Low',
  expected_impact_summary TEXT,
  data_provenance_summary TEXT,
  related_ndc_targets TEXT[] DEFAULT '{}',
  related_activities UUID[] DEFAULT '{}',
  related_projects TEXT[] DEFAULT '{}',
  data_status public.data_status NOT NULL DEFAULT 'Illustrative',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Adaptation options
CREATE TABLE public.adaptation_options (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  hazard_types TEXT[] NOT NULL DEFAULT '{}',
  applicable_sectors TEXT[] NOT NULL DEFAULT '{}',
  description TEXT,
  expected_risk_reduction TEXT,
  cost_range_min_usd NUMERIC,
  cost_range_max_usd NUMERIC,
  co_benefits TEXT,
  related_ndc_targets TEXT[] DEFAULT '{}',
  related_activities UUID[] DEFAULT '{}',
  evidence_links TEXT[] DEFAULT '{}',
  data_status public.data_status NOT NULL DEFAULT 'Illustrative',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hazard_layers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exposure_layers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vulnerability_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adaptation_options ENABLE ROW LEVEL SECURITY;

-- Read policies: any signed-in user
CREATE POLICY "Hazard layers viewable" ON public.hazard_layers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Exposure layers viewable" ON public.exposure_layers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Vulnerability models viewable" ON public.vulnerability_models FOR SELECT TO authenticated USING (true);
CREATE POLICY "Districts viewable" ON public.risk_districts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Risk cells viewable" ON public.risk_cells FOR SELECT TO authenticated USING (true);
CREATE POLICY "Risk assessments viewable" ON public.risk_assessments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Adaptation options viewable" ON public.adaptation_options FOR SELECT TO authenticated USING (true);

-- Write policies: Admin only
CREATE POLICY "Admins manage hazard layers" ON public.hazard_layers FOR ALL TO authenticated
  USING (current_user_has_role('Admin'::app_role)) WITH CHECK (current_user_has_role('Admin'::app_role));
CREATE POLICY "Admins manage exposure layers" ON public.exposure_layers FOR ALL TO authenticated
  USING (current_user_has_role('Admin'::app_role)) WITH CHECK (current_user_has_role('Admin'::app_role));
CREATE POLICY "Admins manage vulnerability models" ON public.vulnerability_models FOR ALL TO authenticated
  USING (current_user_has_role('Admin'::app_role)) WITH CHECK (current_user_has_role('Admin'::app_role));
CREATE POLICY "Admins manage districts" ON public.risk_districts FOR ALL TO authenticated
  USING (current_user_has_role('Admin'::app_role)) WITH CHECK (current_user_has_role('Admin'::app_role));
CREATE POLICY "Admins manage risk cells" ON public.risk_cells FOR ALL TO authenticated
  USING (current_user_has_role('Admin'::app_role)) WITH CHECK (current_user_has_role('Admin'::app_role));
CREATE POLICY "Admins manage risk assessments" ON public.risk_assessments FOR ALL TO authenticated
  USING (current_user_has_role('Admin'::app_role)) WITH CHECK (current_user_has_role('Admin'::app_role));
CREATE POLICY "Admins manage adaptation options" ON public.adaptation_options FOR ALL TO authenticated
  USING (current_user_has_role('Admin'::app_role)) WITH CHECK (current_user_has_role('Admin'::app_role));

-- Trigger to maintain updated_at on hazard_layers
CREATE TRIGGER trg_hazard_layers_updated_at
  BEFORE UPDATE ON public.hazard_layers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================
-- SEED DATA (illustrative only)
-- ============================

-- Hazard layers
INSERT INTO public.hazard_layers (id, name, hazard_type, acute_or_chronic, scenario_name, time_horizon, spatial_resolution, geography_coverage, source_provider, source_url, license, vintage_date, confidence_rating, uncertainty_notes, methodology_notes, data_status, data_access_mode) VALUES
('HL_FLOOD_V0', 'Flood Risk (Illustrative Index)', 'Flooding', 'Acute', 'Baseline', 'Current', 'District-level (index)', 'Uganda (placeholder districts)', 'Prototype seed (placeholder)', 'N/A', 'Internal prototype placeholder', '2026-04-24', 'Low', 'Illustrative only; not derived from hydrological modeling.', 'District-level intensity index (0–100) for UI testing; replace with real ingestion later.', 'Illustrative', 'Upload'),
('HL_FIRE_V0', 'Wildfire Susceptibility (Illustrative Index)', 'Wildfire', 'Acute', 'Baseline', 'Current', 'District-level (index)', 'Uganda (placeholder districts)', 'Prototype seed (placeholder)', 'N/A', 'Internal prototype placeholder', '2026-04-24', 'Low', 'Illustrative only; not derived from observed fire events or EO-based fire products.', 'District-level susceptibility index (0–100) for UI testing; replace with real EO ingestion later.', 'Illustrative', 'Upload'),
('HL_DEFOREST_V0', 'Deforestation / Degradation Pressure (Illustrative Index)', 'Deforestation', 'Chronic', 'Baseline', 'Current', 'District-level (index)', 'Uganda (placeholder districts)', 'Prototype seed (placeholder)', 'N/A', 'Internal prototype placeholder', '2026-04-24', 'Low', 'Illustrative only; not derived from validated forest change monitoring.', 'Policy-facing pressure index (0–100) to stress-test NDC/AFOLU decision flows; replace with EO-based monitoring later.', 'Illustrative', 'Upload');

-- Districts (placeholder geometries)
INSERT INTO public.risk_districts (id, name, region, geojson) VALUES
('D_KAMPALA_PH', 'Kampala (Placeholder)', 'Central (Placeholder)', '{"type":"Polygon","coordinates":[[[32.55,0.25],[32.75,0.25],[32.75,0.45],[32.55,0.45],[32.55,0.25]]]}'::jsonb),
('D_KASESE_PH', 'Kasese (Placeholder)', 'Western (Placeholder)', '{"type":"Polygon","coordinates":[[[30.00,0.00],[30.25,0.00],[30.25,0.25],[30.00,0.25],[30.00,0.00]]]}'::jsonb),
('D_GULU_PH', 'Gulu (Placeholder)', 'Northern (Placeholder)', '{"type":"Polygon","coordinates":[[[32.15,2.65],[32.45,2.65],[32.45,2.95],[32.15,2.95],[32.15,2.65]]]}'::jsonb);

-- Risk cells (3 hazards × 3 districts)
INSERT INTO public.risk_cells (id, district_id, hazard_layer_id, intensity_score_0_100, risk_level, confidence, scenario, time_horizon, vintage, source_provider, source_url, notes, data_status) VALUES
('RC_001','D_KAMPALA_PH','HL_FLOOD_V0',85,'Extreme','Low','Baseline','Current','2026-04-24','Prototype seed','N/A','Illustrative only – used to test choropleth styling and provenance cards.','Illustrative'),
('RC_002','D_KAMPALA_PH','HL_FIRE_V0',20,'Low','Low','Baseline','Current','2026-04-24','Prototype seed','N/A','Illustrative only.','Illustrative'),
('RC_003','D_KAMPALA_PH','HL_DEFOREST_V0',30,'Low','Low','Baseline','Current','2026-04-24','Prototype seed','N/A','Illustrative only.','Illustrative'),
('RC_004','D_KASESE_PH','HL_FLOOD_V0',70,'High','Low','Baseline','Current','2026-04-24','Prototype seed','N/A','Illustrative only.','Illustrative'),
('RC_005','D_KASESE_PH','HL_FIRE_V0',35,'Medium','Low','Baseline','Current','2026-04-24','Prototype seed','N/A','Illustrative only.','Illustrative'),
('RC_006','D_KASESE_PH','HL_DEFOREST_V0',55,'High','Low','Baseline','Current','2026-04-24','Prototype seed','N/A','Illustrative only.','Illustrative'),
('RC_007','D_GULU_PH','HL_FLOOD_V0',40,'Medium','Low','Baseline','Current','2026-04-24','Prototype seed','N/A','Illustrative only.','Illustrative'),
('RC_008','D_GULU_PH','HL_FIRE_V0',65,'High','Low','Baseline','Current','2026-04-24','Prototype seed','N/A','Illustrative only.','Illustrative'),
('RC_009','D_GULU_PH','HL_DEFOREST_V0',75,'High','Low','Baseline','Current','2026-04-24','Prototype seed','N/A','Illustrative only.','Illustrative');

-- Adaptation options
INSERT INTO public.adaptation_options (id, name, hazard_types, applicable_sectors, description, expected_risk_reduction, cost_range_min_usd, cost_range_max_usd, co_benefits, data_status) VALUES
('AO_FLOOD_01', 'Flood resilience package (drainage + early warning + maintenance)', ARRAY['Flooding'], ARRAY['Infrastructure','Urban planning','Disaster risk management'], 'Illustrative bundle of measures that reduce flood impacts and protect service continuity.', 'Medium–High (illustrative)', 500000, 5000000, 'Reduced service disruption; protection of roads/health facilities; improved safety.', 'Illustrative'),
('AO_FIRE_01', 'Landscape fire management (fire breaks + preparedness + monitoring)', ARRAY['Wildfire'], ARRAY['AFOLU','Ecosystems','Local government'], 'Illustrative measures to reduce fire susceptibility and improve response capacity.', 'Medium (illustrative)', 200000, 2000000, 'Reduced land degradation; improved ecosystem services; lower economic losses.', 'Illustrative'),
('AO_DEFOREST_01', 'Deforestation reduction (enforcement + incentives + alternative livelihoods)', ARRAY['Deforestation'], ARRAY['AFOLU','Energy (clean cooking)','Local livelihoods'], 'Illustrative package to reduce deforestation pressure and support sustainable alternatives.', 'Medium–High (illustrative)', 300000, 3000000, 'Forest carbon retention; reduced land degradation; stronger investment credibility.', 'Illustrative');