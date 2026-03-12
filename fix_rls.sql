-- ==========================================
-- FIX FOR RLS INFINITE RECURSION
-- ==========================================

-- 1. Create a `SECURITY DEFINER` function to read a user's role without triggering recursive RLS
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

-- 2. Fix USERS table policies
DROP POLICY IF EXISTS "Admins can read all users" ON public.users;
CREATE POLICY "Admins can read all users" ON public.users 
  FOR SELECT TO authenticated 
  USING (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
CREATE POLICY "Admins can update all users" ON public.users 
  FOR UPDATE TO authenticated 
  USING (public.get_user_role() = 'admin');


-- 3. Fix EVENTS table policies
DROP POLICY IF EXISTS "Organizers and Admins can create events" ON public.events;
CREATE POLICY "Organizers and Admins can create events" ON public.events 
  FOR INSERT TO authenticated 
  WITH CHECK (public.get_user_role() IN ('organizer', 'admin'));

DROP POLICY IF EXISTS "Admins can edit any event" ON public.events;
CREATE POLICY "Admins can edit any event" ON public.events 
  FOR UPDATE TO authenticated 
  USING (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS "Admins can delete any event" ON public.events;
CREATE POLICY "Admins can delete any event" ON public.events 
  FOR DELETE TO authenticated 
  USING (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS "Volunteers can view events" ON public.events;
CREATE POLICY "Volunteers can view events" ON public.events
  FOR SELECT TO authenticated
  USING (public.get_user_role() = 'volunteer');


-- 4. Fix REGISTRATIONS table policies
DROP POLICY IF EXISTS "Admins can view all registrations" ON public.registrations;
CREATE POLICY "Admins can view all registrations" ON public.registrations 
  FOR SELECT TO authenticated 
  USING (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS "Volunteers can read registrations" ON public.registrations;
CREATE POLICY "Volunteers can read registrations" ON public.registrations 
  FOR SELECT TO authenticated 
  USING (public.get_user_role() = 'volunteer');

DROP POLICY IF EXISTS "Volunteers can update registrations for checkins" ON public.registrations;
CREATE POLICY "Volunteers can update registrations for checkins" ON public.registrations 
  FOR UPDATE TO authenticated 
  USING (public.get_user_role() = 'volunteer');

DROP POLICY IF EXISTS "Admins can update registrations for checkins" ON public.registrations;
CREATE POLICY "Admins can update registrations for checkins" ON public.registrations 
  FOR UPDATE TO authenticated 
  USING (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS "Admins can delete any registration" ON public.registrations;
CREATE POLICY "Admins can delete any registration" ON public.registrations 
  FOR DELETE TO authenticated 
  USING (public.get_user_role() = 'admin');


-- 5. Fix EVENT FILES table policies
DROP POLICY IF EXISTS "Admins and Event creators can upload files" ON public.event_files;
CREATE POLICY "Admins and Event creators can upload files" ON public.event_files 
  FOR INSERT TO authenticated 
  WITH CHECK (
    public.get_user_role() = 'admin' OR 
    EXISTS (
      SELECT 1 FROM public.events 
      WHERE events.id = event_files.event_id AND events.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins and Event creators can delete files" ON public.event_files;
CREATE POLICY "Admins and Event creators can delete files" ON public.event_files 
  FOR DELETE TO authenticated 
  USING (
    public.get_user_role() = 'admin' OR 
    EXISTS (
      SELECT 1 FROM public.events 
      WHERE events.id = event_files.event_id AND events.created_by = auth.uid()
    )
  );
