-- ==========================================
-- ADMIN METRICS (Phase 6)
-- ==========================================

-- 1. Create a junction table to track which volunteers are assigned to which event
CREATE TABLE IF NOT EXISTS public.event_volunteers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- Enable RLS
ALTER TABLE public.event_volunteers ENABLE ROW LEVEL SECURITY;

-- Allow Admins and event creators to read volunteers
CREATE POLICY "Admins and Organizers can read event volunteers" ON public.event_volunteers
  FOR SELECT TO authenticated
  USING (
      public.get_user_role() = 'admin' OR 
      EXISTS (
          SELECT 1 FROM public.events 
          WHERE events.id = event_volunteers.event_id AND events.created_by = auth.uid()
      )
  );

-- 2. Update the promote_to_volunteer function to also insert the mapping
CREATE OR REPLACE FUNCTION public.promote_to_volunteer(target_email TEXT, target_event_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role TEXT;
  target_user_id UUID;
  parsed_ev_id UUID;
BEGIN
  -- 1. Verify caller is an Admin OR the event creator
  SELECT role INTO caller_role FROM public.users WHERE id = auth.uid();
  parsed_ev_id := target_event_id::UUID;
  
  IF caller_role != 'admin' THEN
      IF NOT EXISTS (SELECT 1 FROM public.events WHERE id = parsed_ev_id AND created_by = auth.uid()) THEN
        RAISE EXCEPTION 'Not authorized. You must be an Admin or the Event Creator to assign volunteers to this event.';
      END IF;
  END IF;

  -- 2. Find target user
  SELECT id INTO target_user_id FROM public.users WHERE email = target_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found with email: %', target_email;
  END IF;

  -- 3. Update standard role globally if not already elevated higher
  IF (SELECT role FROM public.users WHERE id = target_user_id) = 'student' THEN
      UPDATE public.users SET role = 'volunteer' WHERE id = target_user_id;
  END IF;

  -- 4. Map the volunteer to this specific event
  INSERT INTO public.event_volunteers (event_id, user_id)
  VALUES (parsed_ev_id, target_user_id)
  ON CONFLICT (event_id, user_id) DO NOTHING;

  -- 5. Return success
  RETURN json_build_object(
    'success', true, 
    'message', 'User successfully promoted and assigned to Event.',
    'email', target_email
  );
END;
$$;
