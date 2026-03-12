-- ==========================================
-- NEW FEATURES SCHEMA UPDATE (v2)
-- CampusSync: Advanced Ticketing & Profiles
-- ==========================================

-- 1. ENHANCE USERS TABLE (Add 'volunteer' role)
-- Drop existing constraint gracefully (assuming the standard naming from supabase or manual creation)
-- NOTE: In Postgres, dropping a check constraint requires knowing its name. 
-- Since we know from the previous schema it was inline: `role TEXT DEFAULT 'student' CHECK (role IN ('student', 'organizer', 'admin'))`
-- We can alter the type safely by dropping the constraint and adding a new one, OR we can explicitly define it.
-- For safety, we will alter the table to drop the constraint by querying it dynamically or just dropping the generic one.
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.users'::regclass AND contype = 'c' AND consrc ILIKE '%role%';
  
  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.users DROP CONSTRAINT ' || constraint_name;
  END IF;
END $$;

ALTER TABLE public.users 
  ADD CONSTRAINT users_role_check 
  CHECK (role IN ('student', 'organizer', 'admin', 'volunteer'));


-- 2. ENHANCE EVENTS TABLE (Single vs Multiple Tickets)
ALTER TABLE public.events 
  ADD COLUMN IF NOT EXISTS ticket_type TEXT DEFAULT 'single' CHECK (ticket_type IN ('single', 'multiple'));


-- 3. ENHANCE REGISTRATIONS TABLE (True Tickets & Check-Ins)
ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS ticket_id UUID DEFAULT gen_random_uuid() UNIQUE;

ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS check_ins INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_registrations_ticket_id ON public.registrations(ticket_id);


-- 4. UPDATE POLICIES FOR VOLUNTEER SCANNING
-- Volunteers need to read events and read/update registrations
CREATE POLICY "Volunteers can read registrations" ON public.registrations 
  FOR SELECT TO authenticated 
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'volunteer');

CREATE POLICY "Volunteers can update registrations for checkins" ON public.registrations 
  FOR UPDATE TO authenticated 
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'volunteer');

CREATE POLICY "Volunteers can view events" ON public.events 
  FOR SELECT TO authenticated 
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'volunteer');
  
-- Also ensure Admins can perform these updates if not explicitly allowed yet on Registrations
CREATE POLICY "Admins can update registrations for checkins" ON public.registrations 
  FOR UPDATE TO authenticated 
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');

-- ==========================================
-- INSTRUCTIONS:
-- Run this script in your Supabase SQL Editor.
-- It is completely non-destructive and safe for existing data.
-- ==========================================
