-- ========================================================
-- NAWI VERIFY — OIML R 76-1 LEGAL METROLOGY SUPABASE SCHEMA
-- ========================================================

-- Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------------------------------
-- 1. PROFILES TABLE
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (
    role IN (
      'ADMIN',
      'TESTING_OFFICER',
      'TECHNICAL_REVIEWER',
      'APPROVING_OFFICER',
      'LAB_DIRECTOR',
      'READ_ONLY_AUDITOR'
    )
  ),
  organization TEXT DEFAULT 'National Legal Metrology Laboratory',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Auto-create profile trigger on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, organization)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'TESTING_OFFICER'),
    COALESCE(new.raw_user_meta_data->>'organization', 'National Legal Metrology Laboratory')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- --------------------------------------------------------
-- 2. INSTRUMENTS TABLE
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.instruments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument_code TEXT UNIQUE NOT NULL,
  manufacturer TEXT NOT NULL,
  model TEXT NOT NULL,
  serial_number TEXT NOT NULL,
  instrument_type TEXT NOT NULL,
  accuracy_class TEXT NOT NULL CHECK (accuracy_class IN ('Class I', 'Class II', 'Class III', 'Class IIII')),
  max_capacity NUMERIC NOT NULL CHECK (max_capacity > 0),
  max_unit TEXT NOT NULL CHECK (max_unit IN ('mg', 'g', 'kg', 't')),
  min_capacity NUMERIC NOT NULL CHECK (min_capacity >= 0),
  min_unit TEXT NOT NULL CHECK (min_unit IN ('mg', 'g', 'kg', 't')),
  scale_interval_d NUMERIC NOT NULL CHECK (scale_interval_d > 0),
  scale_interval_d_unit TEXT NOT NULL CHECK (scale_interval_d_unit IN ('mg', 'g', 'kg', 't')),
  verification_interval_e NUMERIC NOT NULL CHECK (verification_interval_e > 0),
  verification_interval_e_unit TEXT NOT NULL CHECK (verification_interval_e_unit IN ('mg', 'g', 'kg', 't')),
  verification_intervals_n NUMERIC NOT NULL CHECK (verification_intervals_n >= 100),
  digital_indication BOOLEAN DEFAULT true NOT NULL,
  zero_setting_type TEXT DEFAULT 'SEMI_AUTOMATIC',
  tare_device_available BOOLEAN DEFAULT false NOT NULL,
  tare_type TEXT DEFAULT 'NONE' CHECK (tare_type IN ('NONE', 'SUBTRACTIVE', 'ADDITIVE')),
  maximum_tare_effect NUMERIC DEFAULT 0 CHECK (maximum_tare_effect >= 0),
  maximum_tare_unit TEXT DEFAULT 'kg',
  load_receptor_type TEXT DEFAULT 'PLATFORM',
  number_of_supports INTEGER DEFAULT 4 CHECK (number_of_supports >= 1),
  status TEXT DEFAULT 'Under Evaluation' CHECK (status IN ('Compliant', 'Non-Compliant', 'Under Evaluation', 'Pending Review')),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT check_min_less_than_max CHECK (min_capacity < max_capacity)
);


-- --------------------------------------------------------
-- 3. TEST SESSIONS TABLE
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.test_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_code TEXT UNIQUE NOT NULL,
  instrument_id UUID REFERENCES public.instruments(id) ON DELETE CASCADE NOT NULL,
  test_context TEXT DEFAULT 'TYPE_EXAMINATION' CHECK (test_context IN ('TYPE_EXAMINATION', 'INITIAL_VERIFICATION', 'IN_SERVICE_INSPECTION')),
  verification_mode TEXT DEFAULT 'INITIAL_VERIFICATION',
  workflow_status TEXT DEFAULT 'IN_PROGRESS' CHECK (
    workflow_status IN (
      'DRAFT',
      'IN_PROGRESS',
      'TESTING_COMPLETE',
      'UNDER_REVIEW',
      'CHANGES_REQUESTED',
      'TECHNICALLY_APPROVED',
      'APPROVED',
      'FINALIZED'
    )
  ),
  evaluation_result TEXT DEFAULT 'UNDER_EVALUATION' CHECK (
    evaluation_result IN ('UNDER_EVALUATION', 'COMPLIANT', 'NON_COMPLIANT')
  ),
  testing_officer_id UUID REFERENCES public.profiles(id),
  technical_reviewer_id UUID REFERENCES public.profiles(id),
  approving_officer_id UUID REFERENCES public.profiles(id),
  rule_standard TEXT DEFAULT 'OIML R 76-1' NOT NULL,
  rule_version TEXT DEFAULT '2006' NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  submitted_at TIMESTAMP WITH TIME ZONE,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  finalized_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- --------------------------------------------------------
-- 4. SESSION TESTS TABLE
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.session_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.test_sessions(id) ON DELETE CASCADE NOT NULL,
  test_type TEXT NOT NULL CHECK (
    test_type IN (
      'ACCURACY',
      'REPEATABILITY',
      'ECCENTRICITY',
      'DISCRIMINATION',
      'ZERO_SETTING',
      'TARE',
      'STATIC_TEMPERATURE'
    )
  ),
  required BOOLEAN DEFAULT true NOT NULL,
  applicability_status TEXT DEFAULT 'APPLICABLE' CHECK (
    applicability_status IN ('APPLICABLE', 'NOT_APPLICABLE', 'REQUIRES_CONFIRMATION')
  ),
  completion_status TEXT DEFAULT 'NOT_STARTED' CHECK (
    completion_status IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'NEEDS_ATTENTION', 'NOT_APPLICABLE')
  ),
  result TEXT DEFAULT 'INCOMPLETE',
  rule_reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_session_test_type UNIQUE (session_id, test_type)
);


-- --------------------------------------------------------
-- 5. TEST OBSERVATIONS TABLE
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.test_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_test_id UUID REFERENCES public.session_tests(id) ON DELETE CASCADE NOT NULL,
  observation_type TEXT NOT NULL,
  reference_value NUMERIC,
  reference_unit TEXT CHECK (reference_unit IN ('mg', 'g', 'kg', 't')),
  indicated_value NUMERIC,
  indicated_unit TEXT CHECK (indicated_unit IN ('mg', 'g', 'kg', 't')),
  calculated_error NUMERIC,
  error_unit TEXT CHECK (error_unit IN ('mg', 'g', 'kg', 't')),
  mpe_value NUMERIC,
  mpe_unit TEXT CHECK (mpe_unit IN ('mg', 'g', 'kg', 't')),
  result TEXT CHECK (result IN ('WITHIN_MPE', 'EXCEEDS_MPE', 'WITHIN_LIMIT', 'EXCEEDS_LIMIT', 'CONFIRMED', 'NOT_OBSERVED')),
  position TEXT,
  trial_number INTEGER,
  series_name TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  recorded_by UUID REFERENCES public.profiles(id),
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- --------------------------------------------------------
-- 6. REVIEW COMMENTS TABLE
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.review_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.test_sessions(id) ON DELETE CASCADE NOT NULL,
  session_test_id UUID REFERENCES public.session_tests(id) ON DELETE SET NULL,
  comment TEXT NOT NULL,
  comment_type TEXT NOT NULL CHECK (
    comment_type IN ('GENERAL', 'CHANGE_REQUEST', 'TECHNICAL_REVIEW', 'APPROVAL_NOTE')
  ),
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- --------------------------------------------------------
-- 7. WORKFLOW HISTORY TABLE
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workflow_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.test_sessions(id) ON DELETE CASCADE NOT NULL,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  action TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- --------------------------------------------------------
-- 8. AUDIT EVENTS TABLE
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id),
  session_id UUID REFERENCES public.test_sessions(id) ON DELETE SET NULL,
  instrument_id UUID REFERENCES public.instruments(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- --------------------------------------------------------
-- 9. REPORTS TABLE
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_code TEXT UNIQUE NOT NULL,
  session_id UUID REFERENCES public.test_sessions(id) ON DELETE CASCADE NOT NULL,
  report_status TEXT DEFAULT 'DRAFT' CHECK (report_status IN ('DRAFT', 'APPROVED', 'FINALIZED')),
  evaluation_result TEXT DEFAULT 'UNDER_EVALUATION',
  generated_by UUID REFERENCES public.profiles(id),
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  finalized_at TIMESTAMP WITH TIME ZONE,
  report_data JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- --------------------------------------------------------
-- 10. DOCUMENTS TABLE (Phase 2)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument_id UUID REFERENCES public.instruments(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.test_sessions(id) ON DELETE CASCADE,
  session_test_id UUID REFERENCES public.session_tests(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (
    document_type IN (
      'INSTRUMENT_PHOTO',
      'NAMEPLATE_PHOTO',
      'TECHNICAL_DATASHEET',
      'USER_MANUAL',
      'PREVIOUS_CERTIFICATE',
      'TEST_EVIDENCE',
      'CALIBRATION_WEIGHT_CERTIFICATE',
      'LAB_SUPPORTING_DOCUMENT',
      'OTHER'
    )
  ),
  file_name TEXT NOT NULL,
  storage_bucket TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  description TEXT,
  uploaded_by UUID REFERENCES public.profiles(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- --------------------------------------------------------
-- 11. REPORT VERSIONS TABLE (Phase 2)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.report_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES public.reports(id) ON DELETE CASCADE NOT NULL,
  version_number INTEGER NOT NULL,
  session_snapshot JSONB NOT NULL,
  generated_by UUID REFERENCES public.profiles(id),
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  storage_path TEXT,
  status TEXT NOT NULL CHECK (status IN ('DRAFT', 'APPROVED', 'FINAL')),
  CONSTRAINT unique_report_version UNIQUE (report_id, version_number)
);


-- --------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- --------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_versions ENABLE ROW LEVEL SECURITY;

-- Read policies for authenticated users
CREATE POLICY "Authenticated users can view profiles" ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can view instruments" ON public.instruments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can view test_sessions" ON public.test_sessions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can view session_tests" ON public.session_tests FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can view test_observations" ON public.test_observations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can view review_comments" ON public.review_comments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can view workflow_history" ON public.workflow_history FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can view audit_events" ON public.audit_events FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can view reports" ON public.reports FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can view documents" ON public.documents FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can view report_versions" ON public.report_versions FOR SELECT USING (auth.role() = 'authenticated');

-- Write policies for authenticated users
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Testing Officers & Admins can create instruments" ON public.instruments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Testing Officers & Admins can update instruments" ON public.instruments FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert test_sessions" ON public.test_sessions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update test_sessions" ON public.test_sessions FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage session_tests" ON public.session_tests FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage test_observations" ON public.test_observations FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage review_comments" ON public.review_comments FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage workflow_history" ON public.workflow_history FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert audit_events" ON public.audit_events FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage reports" ON public.reports FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage documents" ON public.documents FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage report_versions" ON public.report_versions FOR ALL USING (auth.role() = 'authenticated');

-- --------------------------------------------------------
-- STORAGE BUCKETS SETUP INSTRUCTIONS (RUN IN SUPABASE SQL)
-- --------------------------------------------------------
-- INSERT INTO storage.buckets (id, name, public) VALUES ('instrument-documents', 'instrument-documents', false) ON CONFLICT (id) DO NOTHING;
-- INSERT INTO storage.buckets (id, name, public) VALUES ('test-evidence', 'test-evidence', false) ON CONFLICT (id) DO NOTHING;
-- INSERT INTO storage.buckets (id, name, public) VALUES ('generated-reports', 'generated-reports', false) ON CONFLICT (id) DO NOTHING;
