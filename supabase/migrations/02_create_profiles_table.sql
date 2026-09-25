-- Migration: 02_create_profiles_table.sql
-- Description: Create public.profiles table linked to auth.users for NAWI Verify
-- Application: NAWI Verify (OIML R 76 Legal Metrology Automation Platform)

-- 1. Create Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (
    role IN (
      'ADMIN',
      'TESTING_OFFICER',
      'TECHNICAL_REVIEWER',
      'LAB_DIRECTOR',
      'AUDITOR'
    )
  ),
  organization TEXT NOT NULL DEFAULT 'National Legal Metrology Laboratory',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 3. Automatic updated_at Trigger Function with Safe Search Path
CREATE OR REPLACE FUNCTION public.update_profiles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_profiles_updated_at();

-- Defense-in-depth: Revoke public execution on trigger function
REVOKE EXECUTE ON FUNCTION public.update_profiles_updated_at() FROM PUBLIC;

-- 4. Automatic Profile Creation Trigger Function (SECURITY DEFINER with Safe Search Path)
-- SECURITY NOTICE: Client-supplied 'role' and 'organization' in raw_user_meta_data are INTENTIONALLY IGNORED.
-- All newly registered users strictly receive:
--   - safe default role: 'TESTING_OFFICER'
--   - safe default organization: 'National Legal Metrology Laboratory'
-- Privileged roles (ADMIN, TECHNICAL_REVIEWER, LAB_DIRECTOR, AUDITOR) can only be assigned by a Database Administrator.
-- Note: organization may only be changed through an authorized administrative process.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, organization)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email, 'Metrology Officer'),
    'TESTING_OFFICER',                    -- Hardcoded safe default role. Client signup metadata for 'role' is IGNORED.
    'National Legal Metrology Laboratory' -- Hardcoded safe default organization. Client signup metadata for 'organization' is IGNORED.
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Defense-in-depth: Revoke public execution on user creation handler
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 6. Re-runnable Row Level Security Policies (Without Self-Referential Queries)

-- Drop existing policies if present for clean re-run safety
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Policy 1: Authenticated users can view ONLY their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy 2: Authenticated users can update ONLY their own row
-- (Role & system column protection is enforced via Column-Level Privileges below)
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 7. Explicit Column-Level Security Grants & Revokes

-- Revoke ALL default privileges on profiles from anonymous users, authenticated users, and public
REVOKE ALL ON public.profiles FROM anon, authenticated, public;

-- Grant SELECT permission on public.profiles to authenticated users
GRANT SELECT ON public.profiles TO authenticated;

-- Grant UPDATE permission ONLY on full_name to authenticated users.
-- UPDATE permission is EXPLICITLY WITHHELD for 'role', 'organization', 'id', 'created_at', and 'updated_at'.
-- Note: organization may only be changed through an authorized administrative process.
GRANT UPDATE (full_name) ON public.profiles TO authenticated;

-- 8. Automatic Email Confirmation Trigger Function (Bypasses email rate limits by auto-confirming users on creation)
CREATE OR REPLACE FUNCTION public.auto_confirm_new_users()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NULL THEN
    NEW.email_confirmed_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_auto_confirm ON auth.users;
CREATE TRIGGER on_auth_user_created_auto_confirm
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_new_users();

-- Defense-in-depth: Revoke public execution on auto confirm function
REVOKE EXECUTE ON FUNCTION public.auto_confirm_new_users() FROM PUBLIC;

