-- ============================================================================
-- MIGRATION: 01_create_instruments_table.sql
-- PROJECT: NAWI Verify (SIH26035) — OIML R 76-1 Legal Metrology Platform
-- TABLE: public.instruments
-- ============================================================================

-- 1. CREATE INSTRUMENTS TABLE
CREATE TABLE IF NOT EXISTS public.instruments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument_code TEXT UNIQUE NOT NULL,
  manufacturer TEXT NOT NULL,
  model TEXT NOT NULL,
  serial_number TEXT NOT NULL,
  instrument_type TEXT NOT NULL,

  -- Canonical OIML R 76-1 Accuracy Class ('I', 'II', 'III', 'IIII')
  accuracy_class TEXT NOT NULL CHECK (
    accuracy_class IN ('I', 'II', 'III', 'IIII')
  ),

  -- Maximum Capacity (Max > 0)
  max_capacity NUMERIC NOT NULL CHECK (max_capacity > 0),
  max_unit TEXT NOT NULL CHECK (max_unit IN ('mg', 'g', 'kg', 't')),

  -- Minimum Capacity (Min >= 0)
  -- NOTE: A raw SQL "CHECK (min_capacity < max_capacity)" constraint is omitted
  -- because Min and Max may be specified in different units (e.g. Min = 100 g, Max = 30 kg,
  -- where raw numeric 100 < 30 would incorrectly fail). Canonical normalized unit comparison
  -- (normalized Min < normalized Max) is strictly enforced in Micrograms (µg) by the
  -- application metrology service layer.
  min_capacity NUMERIC NOT NULL CHECK (min_capacity >= 0),
  min_unit TEXT NOT NULL CHECK (min_unit IN ('mg', 'g', 'kg', 't')),

  -- Actual Scale Interval d (d > 0)
  scale_interval_d NUMERIC NOT NULL CHECK (scale_interval_d > 0),
  scale_interval_d_unit TEXT NOT NULL CHECK (scale_interval_d_unit IN ('mg', 'g', 'kg', 't')),

  -- Verification Scale Interval e (e > 0)
  verification_interval_e NUMERIC NOT NULL CHECK (verification_interval_e > 0),
  verification_interval_e_unit TEXT NOT NULL CHECK (verification_interval_e_unit IN ('mg', 'g', 'kg', 't')),

  -- Verification Scale Intervals Traceability (n = Max / e > 0)
  -- Class-specific bounds (n_min, n_max per Table 3) are validated by versioned OIML rule engine.
  verification_intervals_n NUMERIC NOT NULL CHECK (verification_intervals_n > 0),

  -- Display Indication & Zero Devices
  digital_indication BOOLEAN NOT NULL DEFAULT true,
  zero_setting_type TEXT NOT NULL DEFAULT 'SEMI_AUTOMATIC' CHECK (
    zero_setting_type IN ('NON_AUTOMATIC', 'SEMI_AUTOMATIC', 'AUTOMATIC', 'ZERO_TRACKING')
  ),

  -- Tare Device Specifications
  tare_device_available BOOLEAN NOT NULL DEFAULT false,
  tare_type TEXT NOT NULL DEFAULT 'NONE' CHECK (
    tare_type IN ('NONE', 'SUBTRACTIVE', 'ADDITIVE')
  ),
  maximum_tare_effect NUMERIC NOT NULL DEFAULT 0 CHECK (maximum_tare_effect >= 0),
  maximum_tare_unit TEXT NOT NULL DEFAULT 'kg' CHECK (maximum_tare_unit IN ('mg', 'g', 'kg', 't')),

  -- Load Receptor Construction
  load_receptor_type TEXT NOT NULL DEFAULT 'PLATFORM' CHECK (
    load_receptor_type IN ('PLATFORM', 'WEIGHBRIDGE', 'HOPPER', 'TANK', 'VESSEL', 'OTHER')
  ),
  number_of_supports INTEGER CHECK (number_of_supports IS NULL OR number_of_supports > 0),

  -- Master Instrument Lifecycle Status
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (
    status IN ('ACTIVE', 'INACTIVE', 'OUT_OF_SERVICE')
  ),

  -- Timestamps with Timezone (timestamptz)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. UPDATED_AT TIMESTAMP TRIGGER
CREATE OR REPLACE FUNCTION public.update_instruments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_instruments_updated_at ON public.instruments;
CREATE TRIGGER set_instruments_updated_at
  BEFORE UPDATE ON public.instruments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_instruments_updated_at();

-- 3. INDEXES FOR QUERY OPTIMIZATION
CREATE INDEX IF NOT EXISTS idx_instruments_serial_number ON public.instruments(serial_number);
CREATE INDEX IF NOT EXISTS idx_instruments_mfg_model ON public.instruments(manufacturer, model);

-- 4. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.instruments ENABLE ROW LEVEL SECURITY;

-- SECURITY NOTICE:
-- RLS is enabled with 0 access policies.
-- Anonymous and public SELECT / INSERT / UPDATE / DELETE are strictly blocked.
-- Role-based access policies (Testing Officers, Technical Reviewers, Lab Directors)
-- will be defined during the Authentication Phase.
