
-- ============= ENUMS =============
CREATE TYPE public.app_role AS ENUM (
  'ProjectDeveloper','FieldOfficer','MinistryDeliveryOfficer',
  'MRVOfficer','SeniorDecisionMaker','Admin'
);

CREATE TYPE public.workflow_state AS ENUM ('Draft','Submitted','Approved','Returned');
CREATE TYPE public.validation_status AS ENUM ('Seeded','Uploaded','Verified','Modelled');
CREATE TYPE public.relationship_type AS ENUM ('Direct','Enabling','Proxy');

-- ============= UTILITY: updated_at trigger =============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============= PROFILES =============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  ministry_scope TEXT,
  district_scope TEXT[],
  organization_scope TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Profiles viewable by signed-in users"
  ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- ============= USER_ROLES =============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.current_user_has_role(_role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = _role);
$$;

CREATE POLICY "Roles viewable by signed-in users"
  ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.current_user_has_role('Admin'))
  WITH CHECK (public.current_user_has_role('Admin'));

-- ============= ACTIVITIES =============
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  organization TEXT,
  ministry TEXT,
  districts TEXT[] DEFAULT '{}',
  timeframe_start DATE,
  timeframe_end DATE,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','active','completed')),
  workflow_state workflow_state NOT NULL DEFAULT 'Draft',
  owner_ids UUID[] DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_activities_updated BEFORE UPDATE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_activities_created_by ON public.activities(created_by);
CREATE INDEX idx_activities_workflow ON public.activities(workflow_state);

CREATE POLICY "Activities viewable by signed-in users"
  ON public.activities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Implementers create activities"
  ON public.activities FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by AND (
      public.current_user_has_role('ProjectDeveloper') OR
      public.current_user_has_role('FieldOfficer') OR
      public.current_user_has_role('MinistryDeliveryOfficer') OR
      public.current_user_has_role('Admin')
    )
  );
CREATE POLICY "Creator or ministry edits draft activities"
  ON public.activities FOR UPDATE TO authenticated
  USING (
    (auth.uid() = created_by AND workflow_state IN ('Draft','Returned')) OR
    public.current_user_has_role('MinistryDeliveryOfficer') OR
    public.current_user_has_role('Admin')
  );
CREATE POLICY "Admins delete activities"
  ON public.activities FOR DELETE TO authenticated
  USING (public.current_user_has_role('Admin'));

-- ============= ACTIVITY_TARGET_LINKS =============
CREATE TABLE public.activity_target_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  strategy TEXT NOT NULL,
  target_id TEXT NOT NULL,
  indicator_ids TEXT[] DEFAULT '{}',
  relationship_type relationship_type NOT NULL DEFAULT 'Direct',
  expected_contribution TEXT,
  approval_status TEXT NOT NULL DEFAULT 'Pending' CHECK (approval_status IN ('Pending','Approved','Rejected')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.activity_target_links ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_atl_target ON public.activity_target_links(target_id);
CREATE INDEX idx_atl_activity ON public.activity_target_links(activity_id);

CREATE POLICY "Links viewable by signed-in users"
  ON public.activity_target_links FOR SELECT TO authenticated USING (true);
CREATE POLICY "Activity creator proposes links"
  ON public.activity_target_links FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.activities a WHERE a.id = activity_id AND (
      a.created_by = auth.uid() OR
      public.current_user_has_role('MinistryDeliveryOfficer') OR
      public.current_user_has_role('Admin')
    ))
  );
CREATE POLICY "Ministry approves links"
  ON public.activity_target_links FOR UPDATE TO authenticated
  USING (public.current_user_has_role('MinistryDeliveryOfficer') OR public.current_user_has_role('Admin'));
CREATE POLICY "Activity creator deletes own links"
  ON public.activity_target_links FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.activities a WHERE a.id = activity_id AND a.created_by = auth.uid())
    OR public.current_user_has_role('Admin')
  );

-- ============= OUTPUT_RECORDS =============
CREATE TABLE public.output_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  unit TEXT NOT NULL,
  value NUMERIC NOT NULL,
  output_date DATE NOT NULL,
  method TEXT,
  source TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.output_records ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_outputs_activity ON public.output_records(activity_id);

CREATE POLICY "Outputs viewable by signed-in users"
  ON public.output_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Activity members add outputs"
  ON public.output_records FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (SELECT 1 FROM public.activities a WHERE a.id = activity_id AND (
      a.created_by = auth.uid() OR
      public.current_user_has_role('FieldOfficer') OR
      public.current_user_has_role('MinistryDeliveryOfficer') OR
      public.current_user_has_role('Admin')
    ))
  );
CREATE POLICY "Creator updates outputs"
  ON public.output_records FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR public.current_user_has_role('Admin'));

-- ============= EVIDENCE_ITEMS =============
CREATE TABLE public.evidence_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  evidence_type TEXT NOT NULL,
  link_or_file_ref TEXT NOT NULL,
  notes TEXT,
  submitted_by UUID NOT NULL REFERENCES auth.users(id),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  tag TEXT NOT NULL DEFAULT 'Supporting'
);
ALTER TABLE public.evidence_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_evidence_activity ON public.evidence_items(activity_id);

CREATE POLICY "Evidence viewable by signed-in users"
  ON public.evidence_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Activity members add evidence"
  ON public.evidence_items FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = submitted_by);
CREATE POLICY "Submitter updates evidence"
  ON public.evidence_items FOR UPDATE TO authenticated
  USING (auth.uid() = submitted_by OR public.current_user_has_role('Admin'));

-- ============= VALIDATION_RECORDS =============
CREATE TABLE public.validation_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('output','evidence','indicator')),
  entity_id UUID NOT NULL,
  status validation_status NOT NULL DEFAULT 'Uploaded',
  qa_flags TEXT[] DEFAULT '{}',
  notes TEXT,
  validated_by UUID REFERENCES auth.users(id),
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.validation_records ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_validation_entity ON public.validation_records(entity_type, entity_id);

CREATE POLICY "Validation viewable by signed-in users"
  ON public.validation_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "MRV manages validation"
  ON public.validation_records FOR ALL TO authenticated
  USING (public.current_user_has_role('MRVOfficer') OR public.current_user_has_role('Admin'))
  WITH CHECK (public.current_user_has_role('MRVOfficer') OR public.current_user_has_role('Admin'));

-- ============= AUDIT_LOG =============
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  diff_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_audit_entity ON public.audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_actor ON public.audit_log(actor_id);

CREATE POLICY "Audit viewable by signed-in users"
  ON public.audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Signed-in users append audit"
  ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = actor_id);

-- ============= AUTO PROFILE + DEFAULT ROLE ON SIGNUP =============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  -- Demo: every new user gets Admin so they can switch roles in app
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'Admin');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
