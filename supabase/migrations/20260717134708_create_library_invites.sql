-- Create new table for library invites
CREATE TABLE public.library_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id uuid REFERENCES public.libraries(id) ON DELETE CASCADE NOT NULL,
  invite_code text UNIQUE NOT NULL,
  role public.user_role NOT NULL,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  expires_at timestamptz,
  max_uses integer,
  use_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for performance
CREATE INDEX idx_library_invites_library ON public.library_invites(library_id);

-- RLS
ALTER TABLE public.library_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners and Admins can view invites"
ON public.library_invites FOR SELECT
USING (get_user_library_role(library_id) IN ('OWNER', 'ADMIN'));

CREATE POLICY "Owners and Admins can create invites"
ON public.library_invites FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  get_user_library_role(library_id) IN ('OWNER', 'ADMIN')
);

CREATE POLICY "Owners and Admins can update invites"
ON public.library_invites FOR UPDATE
USING (
  get_user_library_role(library_id) IN ('OWNER', 'ADMIN')
);

-- Grants
grant delete on table "public"."library_invites" to "anon";
grant insert on table "public"."library_invites" to "anon";
grant select on table "public"."library_invites" to "anon";
grant update on table "public"."library_invites" to "anon";
grant delete on table "public"."library_invites" to "authenticated";
grant insert on table "public"."library_invites" to "authenticated";
grant select on table "public"."library_invites" to "authenticated";
grant update on table "public"."library_invites" to "authenticated";
grant delete on table "public"."library_invites" to "service_role";
grant insert on table "public"."library_invites" to "service_role";
grant select on table "public"."library_invites" to "service_role";
grant update on table "public"."library_invites" to "service_role";

-- RPC to join library via invite
CREATE OR REPLACE FUNCTION public.join_library_via_invite(p_invite_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invite record;
  v_user_id uuid;
  v_library_name text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Get invite and lock it for update
  SELECT i.*, l.name as library_name 
  INTO v_invite
  FROM public.library_invites i
  JOIN public.libraries l ON l.id = i.library_id
  WHERE i.invite_code = p_invite_code
  FOR UPDATE OF i;

  IF v_invite IS NULL THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;

  IF NOT v_invite.is_active THEN
    RAISE EXCEPTION 'Invite is no longer active';
  END IF;

  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < now() THEN
    RAISE EXCEPTION 'Invite has expired';
  END IF;

  IF v_invite.max_uses IS NOT NULL AND v_invite.use_count >= v_invite.max_uses THEN
    RAISE EXCEPTION 'Invite has reached maximum uses';
  END IF;

  -- Check if already a member
  IF EXISTS (SELECT 1 FROM public.library_members WHERE library_id = v_invite.library_id AND user_id = v_user_id) THEN
    RAISE EXCEPTION 'User is already a member of this library';
  END IF;

  -- Limit checks will be handled by triggers

  -- Insert member
  INSERT INTO public.library_members (library_id, user_id, role)
  VALUES (v_invite.library_id, v_user_id, v_invite.role);

  -- Update invite
  UPDATE public.library_invites
  SET use_count = use_count + 1,
      updated_at = now()
  WHERE id = v_invite.id;

  RETURN jsonb_build_object(
    'library_id', v_invite.library_id, 
    'library_name', v_invite.library_name,
    'role', v_invite.role
  );
END;
$$;

-- Trigger to check shared library limit per user
CREATE OR REPLACE FUNCTION public.check_user_shared_library_limit_trg()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  shared_count INT;
BEGIN
  -- Count how many libraries the user is a non-owner member of
  SELECT count(*) INTO shared_count 
  FROM public.library_members 
  WHERE user_id = NEW.user_id AND role != 'OWNER';
  
  IF shared_count >= 5 THEN
    RAISE EXCEPTION 'User has reached maximum shared library limit of 5 (MVP Limit).';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER enforce_user_shared_library_limit
BEFORE INSERT ON public.library_members
FOR EACH ROW
WHEN (NEW.role != 'OWNER')
EXECUTE FUNCTION public.check_user_shared_library_limit_trg();
