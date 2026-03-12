-- ==========================================
-- CAMPUS SETTINGS & DISCOVERABILITY (Phase 12)
-- ==========================================

-- Alter the core Events table to support high-visibility categories and native Hero Banners
ALTER TABLE public.events 
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General' CHECK (category IN ('General', 'Academics', 'Social', 'Sports', 'Career', 'Other')),
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- We don't need explicit RLS here since standard events are read-all and write-admin anyway.
