-- ============================================================================
-- MIGRATION: 05_create_test_observations_table.sql
-- PROJECT: NAWI Verify (SIH26035) — OIML R 76-1 Legal Metrology Platform
-- TABLE: public.test_observations
-- ============================================================================

-- 1. CREATE TEST_OBSERVATIONS TABLE
CREATE TABLE IF NOT EXISTS public.test_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Key to Parent Session Test (Deleting session_test deletes all contained observations)
  session_test_id UUID NOT NULL REFERENCES public.session_tests(id) ON DELETE CASCADE,

  -- Ordered Observation Index within Test (1, 2, 3...)
  observation_no INTEGER NOT NULL CHECK (observation_no > 0),

  -- Specific Observation Category
  observation_type TEXT NOT NULL CHECK (
    observation_type IN (
      'WEIGHING',
      'REPEATABILITY_READING',
      'ECCENTRICITY_POSITION',
      'DISCRIMINATION',
      'ZERO_SETTING',
      'TARE_SETTING',
      'NET_WEIGHING',
      'TEMPERATURE_POINT'
    )
  ),

  -- COMMON RAW MEASUREMENT FIELDS
  -- Reference Mass / Standard Load Applied (L)
  reference_value NUMERIC,
  reference_unit TEXT CHECK (reference_unit IS NULL OR reference_unit IN ('mg', 'g', 'kg', 't')),

  -- Indicated Mass / Reading on Instrument Display (I)
  indicated_value NUMERIC,
  indicated_unit TEXT CHECK (indicated_unit IS NULL OR indicated_unit IN ('mg', 'g', 'kg', 't')),

  -- Additional Small Test Load Added to Find Changeover Point (ΔL)
  additional_load_value NUMERIC,
  additional_load_unit TEXT CHECK (additional_load_unit IS NULL OR additional_load_unit IN ('mg', 'g', 'kg', 't')),

  -- Tare Mass Applied (T)
  tare_value NUMERIC,
  tare_unit TEXT CHECK (tare_unit IS NULL OR tare_unit IN ('mg', 'g', 'kg', 't')),

  -- Position Label for Eccentricity / Off-Center Loading Tests (e.g., 'CENTER', 'POS_1_FRONT_LEFT')
  position_label TEXT,

  -- Sequential Run Number for Repeatability Test Series (1, 2, 3... n)
  run_number INTEGER CHECK (run_number IS NULL OR run_number > 0),

  -- Ambient Temperature Measurement for Environmental Compliance
  temperature_value NUMERIC,
  temperature_unit TEXT CHECK (temperature_unit IS NULL OR temperature_unit IN ('C')),

  -- CALCULATED RESULT FIELDS (OIML R 76-1 A.4.4.3 Error Traceability Breakdown)
  -- Pre-rounding Indication: P = I + 0.5e - ΔL
  pre_rounding_indication_value NUMERIC,

  -- Raw Error before zero-error correction: E = P - L
  raw_error_value NUMERIC,

  -- Zero Error at no-load / baseline: E0
  zero_error_value NUMERIC,

  -- Corrected Error after changeover & zero adjustment: Ec = E - E0
  corrected_error_value NUMERIC,

  -- Maximum Permissible Error (MPE) for this specific load point per OIML R 76-1 Table 6
  mpe_value NUMERIC,

  -- Canonical Mass Unit for all calculated error & MPE fields
  result_unit TEXT CHECK (result_unit IS NULL OR result_unit IN ('mg', 'g', 'kg', 't')),

  -- Evaluated Observation Result (Determined strictly by TypeScript Metrology Engine)
  result TEXT NOT NULL DEFAULT 'INCOMPLETE' CHECK (
    result IN (
      'INCOMPLETE',
      'WITHIN_LIMIT',
      'EXCEEDS_LIMIT',
      'OBSERVED',
      'NOT_APPLICABLE'
    )
  ),

  -- CALCULATION TRACEABILITY & AUDIT METADATA
  -- Specific OIML Rule Clause Reference (e.g. 'OIML R 76-1 A.4.4.3')
  rule_reference TEXT,

  -- Explainable Calculation Breakdown (load_in_e, mpe_band, mpe_multiplier, delta_L, spread, etc.)
  calculation_trace JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Test-Specific Extension Metadata
  raw_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- RECORDING OFFICER & AUDIT TIMESTAMPS
  recorded_by UUID NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Standard Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- CONSTRAINTS
  -- Constraint 1: Observation numbers must be unique within each parent session_test
  CONSTRAINT uq_test_observations_session_test_no UNIQUE (session_test_id, observation_no),

  -- Constraint 2: Value/Unit pairing integrity checks for raw measurements
  CONSTRAINT chk_test_obs_ref_pair CHECK (
    (reference_value IS NULL AND reference_unit IS NULL) OR
    (reference_value IS NOT NULL AND reference_unit IS NOT NULL)
  ),
  CONSTRAINT chk_test_obs_ind_pair CHECK (
    (indicated_value IS NULL AND indicated_unit IS NULL) OR
    (indicated_value IS NOT NULL AND indicated_unit IS NOT NULL)
  ),
  CONSTRAINT chk_test_obs_add_pair CHECK (
    (additional_load_value IS NULL AND additional_load_unit IS NULL) OR
    (additional_load_value IS NOT NULL AND additional_load_unit IS NOT NULL)
  ),
  CONSTRAINT chk_test_obs_tare_pair CHECK (
    (tare_value IS NULL AND tare_unit IS NULL) OR
    (tare_value IS NOT NULL AND tare_unit IS NOT NULL)
  ),
  CONSTRAINT chk_test_obs_temp_pair CHECK (
    (temperature_value IS NULL AND temperature_unit IS NULL) OR
    (temperature_value IS NOT NULL AND temperature_unit IS NOT NULL)
  ),

  -- Constraint 3: Calculated values require a result_unit when any numeric calculated field is present
  CONSTRAINT chk_test_obs_calc_unit CHECK (
    (pre_rounding_indication_value IS NULL AND
     raw_error_value IS NULL AND
     zero_error_value IS NULL AND
     corrected_error_value IS NULL AND
     mpe_value IS NULL) OR
    result_unit IS NOT NULL
  )
);

-- 2. UPDATED_AT TIMESTAMP TRIGGER FUNCTION (Safe Search Path)
CREATE OR REPLACE FUNCTION public.update_test_observations_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_test_observations_updated_at ON public.test_observations;
CREATE TRIGGER set_test_observations_updated_at
  BEFORE UPDATE ON public.test_observations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_test_observations_updated_at();

-- Defense-in-depth: Revoke public execution on trigger function
REVOKE EXECUTE ON FUNCTION public.update_test_observations_updated_at() FROM PUBLIC;

-- 3. USEFUL INDEXES
CREATE INDEX IF NOT EXISTS idx_test_observations_session_test_id ON public.test_observations(session_test_id);
CREATE INDEX IF NOT EXISTS idx_test_observations_type ON public.test_observations(observation_type);
CREATE INDEX IF NOT EXISTS idx_test_observations_recorded_by ON public.test_observations(recorded_by);
CREATE INDEX IF NOT EXISTS idx_test_observations_created_at ON public.test_observations(created_at);

-- 4. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.test_observations ENABLE ROW LEVEL SECURITY;

-- SECURITY NOTICE:
-- RLS is enabled with 0 access policies.
-- Anonymous and public SELECT / INSERT / UPDATE / DELETE are strictly blocked.
-- Role-based policies will be defined separately after authentication is finalized.
