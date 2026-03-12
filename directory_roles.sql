-- ==========================================
-- USER DIRECTORY ROLES (Phase 9)
-- ==========================================

-- This function uses SECURITY DEFINER to bypass RLS, ensuring users can fetch other users 
-- for the directory views without needing full read access to public.users directly.

CREATE OR REPLACE FUNCTION public.get_users_by_role(target_roles TEXT[])
RETURNS TABLE(
  id UUID,
  email TEXT,
  role TEXT,
  raw_user_meta_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role TEXT;
BEGIN
  -- 1. Identify caller role securely
  SELECT u.role INTO caller_role FROM public.users u WHERE u.id = auth.uid();

  -- 2. Authorization check: Standard users cannot fetch directories
  IF caller_role NOT IN ('admin', 'volunteer') THEN
    RAISE EXCEPTION 'Not authorized. Only admins or volunteers can view user directories.';
  END IF;

  -- 3. Additional Guardrail: Volunteers cannot fetch Admins
  IF caller_role = 'volunteer' AND 'admin' = ANY(target_roles) THEN
     RAISE EXCEPTION 'Not authorized. Volunteers cannot view the Admin directory.';
  END IF;

  -- 4. Return matching users
  RETURN QUERY
  SELECT
    u.id,
    u.email,
    u.role,
    u.raw_user_meta_data,
    u.created_at
  FROM public.users u
  WHERE u.role = ANY(target_roles)
  ORDER BY u.created_at DESC;

END;
$$;
