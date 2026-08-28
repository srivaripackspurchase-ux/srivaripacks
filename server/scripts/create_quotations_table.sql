-- ============================================================
-- SQL MIGRATION: CREATE QUOTATIONS TABLE FOR SUPABASE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    file_id TEXT,
    quotation_number TEXT,
    company_name TEXT NOT NULL,
    pdf_file_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    pdf_base64 TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user-specific queries
CREATE INDEX IF NOT EXISTS idx_quotations_user_id ON public.quotations(user_id);

-- Disable Supabase RLS so Express JWT backend can perform user-filtered queries
-- (The Express backend server handles strict user_id ownership on all queries)
ALTER TABLE public.quotations DISABLE ROW LEVEL SECURITY;
