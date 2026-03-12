-- ==========================================
-- ADVANCED ROLES (Phase 8)
-- ==========================================


-- This function allows existing Admins to elevate another user to an 'admin' role
-- It uses SECURITY DEFINER to bypass normal read-only protections on public.users.

CREATE OR REPLACE FUNCTION public.promote_to_admin(target_email TEXT)
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
    RAISE EXCEPTION 'Not authorized. Only admins can assign other admins.';
  END IF;

  -- 2. Find the target user by email
  SELECT id INTO target_user_id FROM public.users WHERE email = target_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found with email: %', target_email;
  END IF;

  -- 3. Update their role
  UPDATE public.users SET role = 'admin' WHERE id = target_user_id;

  -- 4. Return success
  RETURN json_build_object(
    'success', true, 
    'message', 'User successfully promoted to Admin.',
    'email', target_email
  );
END;
$$;
