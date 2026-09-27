-- Migration: 20260927233000_rbac_and_limit_enforcements.sql
-- Description: Enforce strict RBAC policies, audit logging, invite flow rules, and DB constraints.

-- ==========================================
-- 1. CONSTRAINTS & LIMIT TRIGGERS
-- ==========================================

-- Enforce strictly 1 OWNER per library at DB level
CREATE UNIQUE INDEX IF NOT EXISTS library_members_one_owner_per_library_idx
  ON public.library_members (library_id)
  WHERE (role = 'OWNER');

-- Enforce max 10 members per library (including OWNER)
CREATE OR REPLACE FUNCTION public.check_library_member_limit_trg()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  member_count INT;
BEGIN
  SELECT count(*) INTO member_count
  FROM public.library_members
  WHERE library_id = NEW.library_id;

  IF member_count >= 10 THEN
    RAISE EXCEPTION 'Library has reached maximum member limit of 10.';
  END IF;

  RETURN NEW;
END;
$$;

-- Enforce max 5 libraries per user (owned or shared)
CREATE OR REPLACE FUNCTION public.check_user_library_limit_trg()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  total_count INT;
BEGIN
  SELECT count(*) INTO total_count
  FROM public.library_members
  WHERE user_id = NEW.user_id;

  IF total_count >= 5 THEN
    RAISE EXCEPTION 'User has reached maximum library limit of 5 (owned or shared).';
  END IF;

  RETURN NEW;
END;
$$;

-- Drop old trigger if it existed only for non-owners, replace with trigger for ALL role inserts
DROP TRIGGER IF EXISTS enforce_user_shared_library_limit ON public.library_members;
DROP TRIGGER IF EXISTS enforce_user_library_limit ON public.library_members;
CREATE TRIGGER enforce_user_library_limit
  BEFORE INSERT ON public.library_members
  FOR EACH ROW
  EXECUTE FUNCTION public.check_user_library_limit_trg();

-- Prevent deletion of OWNER membership (OWNER cannot leave, must delete library)
CREATE OR REPLACE FUNCTION public.prevent_owner_member_deletion_trg()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.role = 'OWNER' THEN
    RAISE EXCEPTION 'Library OWNER cannot leave or be removed from the library. Delete the library instead.';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS enforce_prevent_owner_member_deletion ON public.library_members;
CREATE TRIGGER enforce_prevent_owner_member_deletion
  BEFORE DELETE ON public.library_members
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_owner_member_deletion_trg();


-- ==========================================
-- 2. AUDIT LOGGING SYSTEM
-- ==========================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  library_id uuid REFERENCES public.libraries(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.audit_logs OWNER TO postgres;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.audit_logs TO authenticated;
GRANT ALL ON TABLE public.audit_logs TO service_role;

-- Audit trigger function for library_members
CREATE OR REPLACE FUNCTION public.audit_library_member_changes_trg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
    INSERT INTO public.audit_logs (library_id, actor_id, action, target_type, target_id, metadata)
    VALUES (
      NEW.library_id,
      auth.uid(),
      'ROLE_CHANGED',
      'MEMBER',
      NEW.user_id::text,
      jsonb_build_object('old_role', OLD.role, 'new_role', NEW.role)
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (library_id, actor_id, action, target_type, target_id, metadata)
    VALUES (
      OLD.library_id,
      auth.uid(),
      'MEMBER_REMOVED',
      'MEMBER',
      OLD.user_id::text,
      jsonb_build_object('role', OLD.role)
    );
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS audit_library_member_changes ON public.library_members;
CREATE TRIGGER audit_library_member_changes
  AFTER UPDATE OR DELETE ON public.library_members
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_library_member_changes_trg();

-- Audit trigger function for documents
CREATE OR REPLACE FUNCTION public.audit_document_changes_trg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    INSERT INTO public.audit_logs (library_id, actor_id, action, target_type, target_id, metadata)
    VALUES (
      NEW.library_id,
      auth.uid(),
      'DOCUMENT_DELETED',
      'DOCUMENT',
      NEW.id::text,
      jsonb_build_object('title', NEW.title)
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (library_id, actor_id, action, target_type, target_id, metadata)
    VALUES (
      OLD.library_id,
      auth.uid(),
      'DOCUMENT_HARD_DELETED',
      'DOCUMENT',
      OLD.id::text,
      jsonb_build_object('title', OLD.title)
    );
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS audit_document_changes ON public.documents;
CREATE TRIGGER audit_document_changes
  AFTER UPDATE OR DELETE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_document_changes_trg();

-- Audit trigger function for library invites
CREATE OR REPLACE FUNCTION public.audit_invite_changes_trg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (library_id, actor_id, action, target_type, target_id, metadata)
    VALUES (
      NEW.library_id,
      auth.uid(),
      'INVITE_CREATED',
      'INVITE',
      NEW.id::text,
      jsonb_build_object('invite_code', NEW.invite_code, 'role', NEW.role)
    );
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS audit_invite_changes ON public.library_invites;
CREATE TRIGGER audit_invite_changes
  AFTER INSERT ON public.library_invites
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_invite_changes_trg();


-- ==========================================
-- 3. HELPER FUNCTION & RPC UPDATES
-- ==========================================

-- Optimized role lookup function using STABLE and (SELECT auth.uid())
CREATE OR REPLACE FUNCTION public.get_user_library_role("w_id" "uuid")
RETURNS "public"."user_role"
LANGUAGE "sql"
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT role
  FROM public.library_members
  WHERE library_id = w_id
    AND user_id = (SELECT auth.uid());
$$;

-- Enforce invite link redemption rules in RPC
CREATE OR REPLACE FUNCTION public.join_library_via_invite("p_invite_code" "text")
RETURNS "jsonb"
LANGUAGE "plpgsql"
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_invite record;
  v_user_id uuid;
BEGIN
  v_user_id := (SELECT auth.uid());

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Fetch active invite
  SELECT i.*, l.name as library_name INTO v_invite
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

  -- Ensure invite was created by authorized role (OWNER or ADMIN)
  IF NOT EXISTS (
    SELECT 1 FROM public.library_members
    WHERE library_id = v_invite.library_id
      AND user_id = v_invite.created_by
      AND role IN ('OWNER', 'ADMIN')
  ) THEN
    RAISE EXCEPTION 'Invite is invalid or creator no longer has permission to invite.';
  END IF;

  -- Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM public.library_members
    WHERE library_id = v_invite.library_id
      AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'User is already a member of this library';
  END IF;

  -- Insert member (limit triggers check max 10 members and max 5 user libraries)
  INSERT INTO public.library_members (library_id, user_id, role)
  VALUES (v_invite.library_id, v_user_id, v_invite.role);

  -- Log audit event for joining via invite
  INSERT INTO public.audit_logs (library_id, actor_id, action, target_type, target_id, metadata)
  VALUES (
    v_invite.library_id,
    v_user_id,
    'MEMBER_JOINED',
    'MEMBER',
    v_user_id::text,
    jsonb_build_object('invite_code', v_invite.invite_code, 'role', v_invite.role)
  );

  -- Update invite count
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


-- ==========================================
-- 4. REFINED ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Drop all old policies to ensure clean state
DROP POLICY IF EXISTS "Users view libraries they belong to" ON public.libraries;
DROP POLICY IF EXISTS "Users can create libraries" ON public.libraries;
DROP POLICY IF EXISTS "Owners and Admins can update libraries" ON public.libraries;
DROP POLICY IF EXISTS "Owners can delete libraries" ON public.libraries;

DROP POLICY IF EXISTS "Owners and Admins can view and manage members" ON public.library_members;
DROP POLICY IF EXISTS "Users view members of their libraries" ON public.library_members;
DROP POLICY IF EXISTS "Owners and Admins can add members to library" ON public.library_members;
DROP POLICY IF EXISTS "Owners and Admins can update member roles" ON public.library_members;
DROP POLICY IF EXISTS "Owners and Admins can remove members" ON public.library_members;

DROP POLICY IF EXISTS "Users view documents in their libraries" ON public.documents;
DROP POLICY IF EXISTS "Editors/Admins/Owners can manage documents" ON public.documents;

DROP POLICY IF EXISTS "Users view chunks corresponding to documents they can see" ON public.document_chunks;
DROP POLICY IF EXISTS "Editors/Admins/Owners manage chunks" ON public.document_chunks;

DROP POLICY IF EXISTS "Users view edits for documents they can see" ON public.document_edits;
DROP POLICY IF EXISTS "Editors/Admins/Owners manage edits" ON public.document_edits;

DROP POLICY IF EXISTS "Owners and Admins can view invites" ON public.library_invites;
DROP POLICY IF EXISTS "Owners and Admins can create invites" ON public.library_invites;
DROP POLICY IF EXISTS "Owners and Admins can update invites" ON public.library_invites;

--- 4.1 Libraries Policies ---
CREATE POLICY "libraries_select_policy" ON public.libraries
  FOR SELECT TO authenticated
  USING (get_user_library_role(id) IS NOT NULL);

CREATE POLICY "libraries_insert_policy" ON public.libraries
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "libraries_update_policy" ON public.libraries
  FOR UPDATE TO authenticated
  USING (get_user_library_role(id) IN ('OWNER', 'ADMIN'))
  WITH CHECK (get_user_library_role(id) IN ('OWNER', 'ADMIN'));

CREATE POLICY "libraries_delete_policy" ON public.libraries
  FOR DELETE TO authenticated
  USING (get_user_library_role(id) = 'OWNER');

--- 4.2 Library Members Policies ---
CREATE POLICY "library_members_select_policy" ON public.library_members
  FOR SELECT TO authenticated
  USING (get_user_library_role(library_id) IS NOT NULL);

CREATE POLICY "library_members_insert_policy" ON public.library_members
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
    AND (
      get_user_library_role(library_id) IN ('OWNER', 'ADMIN')
      OR user_id = (SELECT auth.uid())
    )
  );

-- ADMIN can update role except for OWNER role (cannot update OWNER, cannot set role to OWNER)
CREATE POLICY "library_members_update_policy" ON public.library_members
  FOR UPDATE TO authenticated
  USING (
    get_user_library_role(library_id) = 'OWNER'
    OR (
      get_user_library_role(library_id) = 'ADMIN'
      AND role != 'OWNER'
    )
  )
  WITH CHECK (
    get_user_library_role(library_id) = 'OWNER'
    OR (
      get_user_library_role(library_id) = 'ADMIN'
      AND role != 'OWNER'
    )
  );

-- Delete member policy: OWNER & ADMIN can remove non-owner members (OWNER cannot be deleted)
CREATE POLICY "library_members_delete_policy" ON public.library_members
  FOR DELETE TO authenticated
  USING (
    role != 'OWNER'
    AND get_user_library_role(library_id) IN ('OWNER', 'ADMIN')
  );

--- 4.3 Documents Policies ---
CREATE POLICY "documents_select_policy" ON public.documents
  FOR SELECT TO authenticated
  USING (get_user_library_role(library_id) IS NOT NULL);

CREATE POLICY "documents_insert_policy" ON public.documents
  FOR INSERT TO authenticated
  WITH CHECK (get_user_library_role(library_id) IN ('OWNER', 'ADMIN', 'EDITOR'));

-- UPDATE: OWNER and ADMIN can update any document; EDITOR can update titles, contents, tags, or soft-delete if author
CREATE POLICY "documents_update_policy" ON public.documents
  FOR UPDATE TO authenticated
  USING (
    get_user_library_role(library_id) IN ('OWNER', 'ADMIN')
    OR (
      get_user_library_role(library_id) = 'EDITOR'
      AND (deleted_at IS NULL OR (SELECT auth.uid()) = ANY(author_ids))
    )
  )
  WITH CHECK (
    get_user_library_role(library_id) IN ('OWNER', 'ADMIN')
    OR (
      get_user_library_role(library_id) = 'EDITOR'
      AND (deleted_at IS NULL OR (SELECT auth.uid()) = ANY(author_ids))
    )
  );

-- DELETE (Hard & Soft delete): OWNER & ADMIN can delete any doc; EDITOR can ONLY delete documents they authored
CREATE POLICY "documents_delete_policy" ON public.documents
  FOR DELETE TO authenticated
  USING (
    get_user_library_role(library_id) IN ('OWNER', 'ADMIN')
    OR (
      get_user_library_role(library_id) = 'EDITOR'
      AND (SELECT auth.uid()) = ANY(author_ids)
    )
  );

--- 4.4 Document Chunks Policies ---
CREATE POLICY "document_chunks_select_policy" ON public.document_chunks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = document_chunks.document_id
        AND get_user_library_role(d.library_id) IS NOT NULL
    )
  );

CREATE POLICY "document_chunks_manage_policy" ON public.document_chunks
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = document_chunks.document_id
        AND get_user_library_role(d.library_id) IN ('OWNER', 'ADMIN', 'EDITOR')
    )
  );

--- 4.5 Document Edits Policies ---
CREATE POLICY "document_edits_select_policy" ON public.document_edits
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = document_edits.document_id
        AND get_user_library_role(d.library_id) IS NOT NULL
    )
  );

CREATE POLICY "document_edits_manage_policy" ON public.document_edits
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = document_edits.document_id
        AND get_user_library_role(d.library_id) IN ('OWNER', 'ADMIN', 'EDITOR')
    )
  );

--- 4.6 Library Invites Policies ---
CREATE POLICY "library_invites_select_policy" ON public.library_invites
  FOR SELECT TO authenticated
  USING (get_user_library_role(library_id) IN ('OWNER', 'ADMIN'));

CREATE POLICY "library_invites_insert_policy" ON public.library_invites
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
    AND get_user_library_role(library_id) IN ('OWNER', 'ADMIN')
  );

CREATE POLICY "library_invites_update_policy" ON public.library_invites
  FOR UPDATE TO authenticated
  USING (get_user_library_role(library_id) IN ('OWNER', 'ADMIN'))
  WITH CHECK (get_user_library_role(library_id) IN ('OWNER', 'ADMIN'));

--- 4.7 Audit Logs Policies ---
CREATE POLICY "audit_logs_select_policy" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (get_user_library_role(library_id) IN ('OWNER', 'ADMIN'));

CREATE POLICY "audit_logs_insert_policy" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
