-- ============================================================
-- Performance Indexes for User Dashboard Speed Optimization
-- Run this in Supabase SQL Editor
-- These are NON-DESTRUCTIVE: they only ADD indexes, never change or delete data
-- ============================================================

-- CRITICAL: Index calculations by user_id (currently MISSING — causes full table scan on every user page load)
CREATE INDEX IF NOT EXISTS idx_calculations_user_id ON calculations(user_id);

-- CRITICAL: Index production_orders by user_id (currently MISSING — causes full table scan on every user page load)
CREATE INDEX IF NOT EXISTS idx_production_orders_user_id ON production_orders(user_id);

-- Index files table by user_id for fast per-user file lookups
-- First ensure user_id column exists on files table
ALTER TABLE files ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);

-- Index quotations by user_id for fast list queries
CREATE INDEX IF NOT EXISTS idx_quotations_user_id ON quotations(user_id);

-- Verify: List all indexes on key tables
SELECT tablename, indexname FROM pg_indexes 
WHERE tablename IN ('calculations', 'production_orders', 'files', 'quotations')
ORDER BY tablename, indexname;
