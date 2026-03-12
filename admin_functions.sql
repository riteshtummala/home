-- ==========================================
-- ADMIN FUNCTIONS (Phase 5)
-- ==========================================

-- This function allows Admins to securely elevate another user's role to 'volunteer'
-- It uses SECURITY DEFINER to bypass the normal read-only protections on the users table.

CREATE OR REPLACE FUNCTION public.promote_to_volunteer(target_email TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role TEXT;
  target_user_id UUID;
BEGIN
  -- 1. Verify the caller is an Admin
  SELECT role INTO caller_role FROM public.users WHERE id = auth.uid();
  
  IF caller_role != 'admin' THEN
    RAISE EXCEPTION 'Not authorized. Only admins can assign volunteers.';
  END IF;

  -- 2. Find the target user by email
  SELECT id INTO target_user_id FROM public.users WHERE email = target_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found with email: %', target_email;
  END IF;

  -- 3. Update their role
  UPDATE public.users SET role = 'volunteer' WHERE id = target_user_id;

  -- 4. Return success
  RETURN json_build_object(
    'success', true, 
    'message', 'User successfully promoted to Volunteer.',
    'email', target_email
  );
END;
$$;
