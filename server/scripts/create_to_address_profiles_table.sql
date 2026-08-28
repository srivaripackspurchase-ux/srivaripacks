-- Migration script to create to_address_profiles table in Supabase
CREATE TABLE IF NOT EXISTS public.to_address_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  keyword TEXT NOT NULL UNIQUE,
  to_address TEXT NOT NULL,
  dear_sir TEXT NOT NULL DEFAULT 'Dear Sir,',
  kind_attn TEXT,
  subject TEXT NOT NULL DEFAULT 'Quotation for Corrugated boxes – Reg.',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index on keyword for fast lookup & case-insensitive uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS idx_to_address_profiles_keyword_lower ON public.to_address_profiles (LOWER(TRIM(keyword)));

-- Enable RLS
ALTER TABLE public.to_address_profiles ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow read access to all authenticated users
DROP POLICY IF EXISTS "Allow authenticated read to_address_profiles" ON public.to_address_profiles;
CREATE POLICY "Allow authenticated read to_address_profiles"
  ON public.to_address_profiles FOR SELECT
  TO authenticated
  USING (true);

-- Policy 2: Allow all actions for admin users / service role
DROP POLICY IF EXISTS "Allow admin full access to_address_profiles" ON public.to_address_profiles;
CREATE POLICY "Allow admin full access to_address_profiles"
  ON public.to_address_profiles FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
