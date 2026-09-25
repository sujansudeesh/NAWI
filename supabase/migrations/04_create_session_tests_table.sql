-- ============================================================================
-- MIGRATION: 04_create_session_tests_table.sql
-- PROJECT: NAWI Verify (SIH26035) — OIML R 76-1 Legal Metrology Platform
-- TABLE: public.session_tests
-- ============================================================================

-- 1. CREATE SESSION_TESTS TABLE
CREATE TABLE IF NOT EXISTS public.session_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Key to Parent Test Session (Deleting session deletes all contained tests)
  session_id UUID NOT NULL REFERENCES public.test_sessions(id) ON DELETE CASCADE,

  -- Standardized OIML R-76 Test Type
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

  -- Requirement Indicator
  required BOOLEAN NOT NULL DEFAULT true,

  -- Applicability Status
  applicability_status TEXT NOT NULL DEFAULT 'APPLICABLE' CHECK (
    applicability_status IN (
      'APPLICABLE',
      'NOT_APPLICABLE',
      'REQUIRES_CONFIRMATION'
    )
  ),

  -- Execution Progress Status
  completion_status TEXT NOT NULL DEFAULT 'NOT_STARTED' CHECK (
    completion_status IN (
      'NOT_STARTED',
      'IN_PROGRESS',
      'COMPLETED',
      'NEEDS_ATTENTION',
      'NOT_APPLICABLE'
    )
  ),

  -- Evaluated Test Result (Determined by Rule Engine, NOT set automatically)
  result TEXT NOT NULL DEFAULT 'INCOMPLETE' CHECK (
    result IN (
      'INCOMPLETE',
      'WITHIN_LIMIT',
      'EXCEEDS_LIMIT',
      'NOT_APPLICABLE'
    )
  ),

  -- OIML Rule & Section Traceability Reference (e.g. 'OIML R 76-1 A.4.4')
  rule_reference TEXT,

  -- Justification text if test is marked NOT_APPLICABLE or REQUIRES_CONFIRMATION
  applicability_reason TEXT,

  -- Standard Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraint: A test session cannot contain duplicate test types
  CONSTRAINT uq_session_tests_session_test_type UNIQUE (session_id, test_type)
);

-- 2. UPDATED_AT TIMESTAMP TRIGGER FUNCTION (Safe Search Path)
CREATE OR REPLACE FUNCTION public.update_session_tests_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_session_tests_updated_at ON public.session_tests;
CREATE TRIGGER set_session_tests_updated_at
  BEFORE UPDATE ON public.session_tests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_session_tests_updated_at();

-- Defense-in-depth: Revoke public execution on trigger function
REVOKE EXECUTE ON FUNCTION public.update_session_tests_updated_at() FROM PUBLIC;

-- 3. USEFUL INDEXES
CREATE INDEX IF NOT EXISTS idx_session_tests_session_id ON public.session_tests(session_id);
CREATE INDEX IF NOT EXISTS idx_session_tests_completion_status ON public.session_tests(completion_status);
CREATE INDEX IF NOT EXISTS idx_session_tests_result ON public.session_tests(result);

-- 4. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.session_tests ENABLE ROW LEVEL SECURITY;

-- SECURITY NOTICE:
-- RLS is enabled with 0 access policies.
-- Anonymous and public SELECT / INSERT / UPDATE / DELETE are strictly blocked.
-- Role-based policies will be defined separately after authentication is finalized.
