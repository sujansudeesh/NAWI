-- ============================================================================
-- MIGRATION: 03_create_test_sessions_table.sql
-- PROJECT: NAWI Verify (SIH26035) — OIML R 76-1 Legal Metrology Platform
-- TABLE: public.test_sessions
-- ============================================================================

-- 1. CREATE TEST_SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.test_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Unique Human-Readable Evaluation Session Identifier (e.g. TS-2026-001)
  session_code TEXT UNIQUE NOT NULL,

  -- Foreign Key to Master Instrument (ON DELETE RESTRICT prevents deleting active/historical instruments)
  instrument_id UUID NOT NULL REFERENCES public.instruments(id) ON DELETE RESTRICT,

  -- OIML R-76 Evaluation Context
  test_context TEXT NOT NULL CHECK (
    test_context IN (
      'TYPE_EXAMINATION',
      'INITIAL_VERIFICATION',
      'IN_SERVICE_INSPECTION'
    )
  ),

  -- Verification Mode (Affects MPE calculation limits in OIML R 76-1 Table 6)
  verification_mode TEXT NOT NULL CHECK (
    verification_mode IN (
      'INITIAL',
      'IN_SERVICE'
    )
  ),

  -- Multi-Officer Legal Approval Workflow Status
  workflow_status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (
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

  -- Evaluated OIML Compliance Result (Independent of Workflow Status)
  evaluation_result TEXT NOT NULL DEFAULT 'UNDER_EVALUATION' CHECK (
    evaluation_result IN (
      'UNDER_EVALUATION',
      'COMPLIANT',
      'NON_COMPLIANT'
    )
  ),

  -- Assigned Officers (Foreign Keys to public.profiles with ON DELETE RESTRICT)
  testing_officer_id UUID NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  technical_reviewer_id UUID NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  approving_officer_id UUID NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,

  -- Metrological Rule & Standard Traceability
  rule_standard TEXT NOT NULL DEFAULT 'OIML R 76-1',
  rule_version TEXT NOT NULL DEFAULT '2006',

  -- Workflow Audit Lifecycle Timestamps
  started_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  finalized_at TIMESTAMPTZ,

  -- Standard Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. UPDATED_AT TIMESTAMP TRIGGER FUNCTION (Safe Search Path)
CREATE OR REPLACE FUNCTION public.update_test_sessions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_test_sessions_updated_at ON public.test_sessions;
CREATE TRIGGER set_test_sessions_updated_at
  BEFORE UPDATE ON public.test_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_test_sessions_updated_at();

-- Defense-in-depth: Revoke public execution on trigger function
REVOKE EXECUTE ON FUNCTION public.update_test_sessions_updated_at() FROM PUBLIC;

-- 3. USEFUL INDEXES (Targeted for frequent queries)
CREATE INDEX IF NOT EXISTS idx_test_sessions_instrument_id ON public.test_sessions(instrument_id);
CREATE INDEX IF NOT EXISTS idx_test_sessions_workflow_status ON public.test_sessions(workflow_status);
CREATE INDEX IF NOT EXISTS idx_test_sessions_testing_officer_id ON public.test_sessions(testing_officer_id);
CREATE INDEX IF NOT EXISTS idx_test_sessions_technical_reviewer_id ON public.test_sessions(technical_reviewer_id);
CREATE INDEX IF NOT EXISTS idx_test_sessions_approving_officer_id ON public.test_sessions(approving_officer_id);
CREATE INDEX IF NOT EXISTS idx_test_sessions_created_at ON public.test_sessions(created_at);

-- 4. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.test_sessions ENABLE ROW LEVEL SECURITY;

-- SECURITY NOTICE:
-- RLS is enabled with 0 access policies.
-- Anonymous and public SELECT / INSERT / UPDATE / DELETE are strictly blocked.
-- Role-based policies will be defined separately after authentication is finalized.
