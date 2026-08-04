-- Add a security-definer RPC so members can leave libraries reliably.
-- This bypasses restrictive RLS for self-removal while still protecting owners.

CREATE OR REPLACE FUNCTION public.leave_library(p_library_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_role text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT role
  INTO v_role
  FROM public.library_members
  WHERE library_id = p_library_id
    AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not a member of this library';
  END IF;

  IF v_role = 'OWNER' THEN
    RAISE EXCEPTION 'Library owner cannot leave. Delete or transfer ownership first.';
  END IF;

  DELETE FROM public.library_members
  WHERE library_id = p_library_id
    AND user_id = v_user_id;
END;
$$;
