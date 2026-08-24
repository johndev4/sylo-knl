SET
  statement_timeout = 0;

SET
  lock_timeout = 0;

SET
  idle_in_transaction_session_timeout = 0;

SET
  client_encoding = 'UTF8';

SET
  standard_conforming_strings = on;

SELECT
  pg_catalog.set_config('search_path', '', false);

SET
  check_function_bodies = false;

SET
  xmloption = content;

SET
  client_min_messages = warning;

SET
  row_security = off;

COMMENT ON SCHEMA "public" IS 'standard public schema';

CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";

CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "extensions";

CREATE TYPE "public"."user_role" AS ENUM ('OWNER', 'ADMIN', 'EDITOR', 'VIEWER');

ALTER TYPE "public"."user_role" OWNER TO "postgres";

CREATE
OR REPLACE FUNCTION "public"."check_document_limit_trg"() RETURNS "trigger" LANGUAGE "plpgsql" AS $$ DECLARE doc_count INT;

BEGIN
SELECT
  count(*) INTO doc_count
FROM
  public.documents
WHERE
  library_id = NEW.library_id;

IF doc_count >= 500 THEN RAISE EXCEPTION 'Workspace reached exact limit of 500 documents (MVP Limit).';

END IF;

RETURN NEW;

END;

$$;

ALTER FUNCTION "public"."check_document_limit_trg"() OWNER TO "postgres";

CREATE
OR REPLACE FUNCTION "public"."check_library_member_limit_trg"() RETURNS "trigger" LANGUAGE "plpgsql" AS $$ DECLARE member_count INT;

BEGIN
SELECT
  count(*) INTO member_count
FROM
  public.library_members
WHERE
  library_id = NEW.library_id;

IF member_count >= 11 THEN RAISE EXCEPTION 'Workspace has reached maximum member limit of 11 (MVP Limit).';

END IF;

RETURN NEW;

END;

$$;

ALTER FUNCTION "public"."check_library_member_limit_trg"() OWNER TO "postgres";

CREATE
OR REPLACE FUNCTION "public"."check_user_shared_library_limit_trg"() RETURNS "trigger" LANGUAGE "plpgsql" AS $$ DECLARE shared_count INT;

BEGIN -- Count how many libraries the user is a non-owner member of
SELECT
  count(*) INTO shared_count
FROM
  public.library_members
WHERE
  user_id = NEW.user_id
  AND role != 'OWNER';

IF shared_count >= 5 THEN RAISE EXCEPTION 'User has reached maximum shared library limit of 5 (MVP Limit).';

END IF;

RETURN NEW;

END;

$$;

ALTER FUNCTION "public"."check_user_shared_library_limit_trg"() OWNER TO "postgres";

CREATE
OR REPLACE FUNCTION "public"."create_library_with_owner"("w_name" "text") RETURNS "jsonb" LANGUAGE "plpgsql" SECURITY DEFINER AS $$ DECLARE new_w_id UUID;

BEGIN IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Unauthorized';

END IF;

IF w_name IS NULL
OR length(trim(w_name)) = 0 THEN RAISE EXCEPTION 'Workspace name is required';

END IF;

INSERT INTO
  public.libraries (name)
VALUES
  (w_name) RETURNING id INTO new_w_id;

INSERT INTO
  public.library_members (library_id, user_id, role)
VALUES
  (new_w_id, auth.uid(), 'OWNER');

RETURN jsonb_build_object('id', new_w_id, 'name', w_name);

END;

$$;

ALTER FUNCTION "public"."create_library_with_owner"("w_name" "text") OWNER TO "postgres";

CREATE
OR REPLACE FUNCTION "public"."get_user_library_role"("w_id" "uuid") RETURNS "public"."user_role" LANGUAGE "sql" SECURITY DEFINER AS $$
SELECT
  role
FROM
  public.library_members
WHERE
  library_id = w_id
  AND user_id = auth.uid();

$$;

ALTER FUNCTION "public"."get_user_library_role"("w_id" "uuid") OWNER TO "postgres";

CREATE
OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger" LANGUAGE "plpgsql" SECURITY DEFINER AS $$ BEGIN
INSERT INTO
  public.users (id, name, email, avatar_url)
VALUES
  (
    new.id,
    COALESCE(
      new.raw_user_meta_data ->> 'full_name',
      split_part(new.email, '@', 1)
    ),
    new.email,
    new.raw_user_meta_data ->> 'avatar_url'
  );

RETURN new;

END;

$$;

ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";

CREATE
OR REPLACE FUNCTION "public"."join_library_via_invite"("p_invite_code" "text") RETURNS "jsonb" LANGUAGE "plpgsql" SECURITY DEFINER AS $$ DECLARE v_invite record;

v_user_id uuid;

v_library_name text;

BEGIN v_user_id := auth.uid();

IF v_user_id IS NULL THEN RAISE EXCEPTION 'Unauthorized';

END IF;

-- Get invite and lock it for update
SELECT
  i.*,
  l.name as library_name INTO v_invite
FROM
  public.library_invites i
  JOIN public.libraries l ON l.id = i.library_id
WHERE
  i.invite_code = p_invite_code FOR
UPDATE
  OF i;

IF v_invite IS NULL THEN RAISE EXCEPTION 'Invite not found';

END IF;

IF NOT v_invite.is_active THEN RAISE EXCEPTION 'Invite is no longer active';

END IF;

IF v_invite.expires_at IS NOT NULL
AND v_invite.expires_at < now() THEN RAISE EXCEPTION 'Invite has expired';

END IF;

IF v_invite.max_uses IS NOT NULL
AND v_invite.use_count >= v_invite.max_uses THEN RAISE EXCEPTION 'Invite has reached maximum uses';

END IF;

-- Check if already a member
IF EXISTS (
  SELECT
    1
  FROM
    public.library_members
  WHERE
    library_id = v_invite.library_id
    AND user_id = v_user_id
) THEN RAISE EXCEPTION 'User is already a member of this library';

END IF;

-- Limit checks will be handled by triggers
-- Insert member
INSERT INTO
  public.library_members (library_id, user_id, role)
VALUES
  (v_invite.library_id, v_user_id, v_invite.role);

-- Update invite
UPDATE
  public.library_invites
SET
  use_count = use_count + 1,
  updated_at = now()
WHERE
  id = v_invite.id;

RETURN jsonb_build_object(
  'library_id',
  v_invite.library_id,
  'library_name',
  v_invite.library_name,
  'role',
  v_invite.role
);

END;

$$;

ALTER FUNCTION "public"."join_library_via_invite"("p_invite_code" "text") OWNER TO "postgres";

CREATE
OR REPLACE FUNCTION "public"."leave_library"("p_library_id" "uuid") RETURNS "void" LANGUAGE "plpgsql" SECURITY DEFINER
SET
  "search_path" TO 'public' AS $$ DECLARE v_user_id uuid := auth.uid();

v_role text;

BEGIN IF v_user_id IS NULL THEN RAISE EXCEPTION 'Unauthorized';

END IF;

SELECT
  role INTO v_role
FROM
  public.library_members
WHERE
  library_id = p_library_id
  AND user_id = v_user_id;

IF NOT FOUND THEN RAISE EXCEPTION 'Not a member of this library';

END IF;

IF v_role = 'OWNER' THEN RAISE EXCEPTION 'Library owner cannot leave. Delete or transfer ownership first.';

END IF;

DELETE FROM
  public.library_members
WHERE
  library_id = p_library_id
  AND user_id = v_user_id;

END;

$$;

ALTER FUNCTION "public"."leave_library"("p_library_id" "uuid") OWNER TO "postgres";

CREATE
OR REPLACE FUNCTION "public"."match_document_chunks"(
  "query_embedding" "extensions"."vector",
  "match_count" integer DEFAULT 10,
  "filter_library_id" "uuid" DEFAULT NULL :: "uuid"
) RETURNS TABLE(
  "id" "uuid",
  "document_id" "uuid",
  "content" "text",
  "similarity" double precision
) LANGUAGE "plpgsql" AS $$ BEGIN RETURN QUERY
SELECT
  dc.id,
  dc.document_id,
  dc.content,
  1 - (dc.embedding <= > query_embedding) AS similarity
FROM
  document_chunks dc
  JOIN documents d ON dc.document_id = d.id
WHERE
  (
    filter_library_id IS NULL
    OR d.library_id = filter_library_id
  )
  AND d.deleted_at IS NULL -- Ignore soft deleted documents
ORDER BY
  dc.embedding <= > query_embedding
LIMIT
  match_count;

END;

$$;

ALTER FUNCTION "public"."match_document_chunks"(
  "query_embedding" "extensions"."vector",
  "match_count" integer,
  "filter_library_id" "uuid"
) OWNER TO "postgres";

CREATE
OR REPLACE FUNCTION "public"."match_document_chunks_multi"(
  "query_embedding" "extensions"."vector",
  "filter_library_ids" "uuid" [] DEFAULT NULL :: "uuid" [],
  "match_count" integer DEFAULT 10
) RETURNS TABLE(
  "id" "uuid",
  "document_id" "uuid",
  "content" "text",
  "similarity" double precision,
  "title" "text",
  "library_name" "text"
) LANGUAGE "plpgsql" AS $$ BEGIN RETURN QUERY
SELECT
  dc.id,
  dc.document_id,
  dc.content,
  1 - (dc.embedding <= > query_embedding) AS similarity,
  d.title,
  l.name as library_name
FROM
  document_chunks dc
  JOIN documents d ON dc.document_id = d.id
  JOIN libraries l ON d.library_id = l.id
WHERE
  (
    filter_library_ids IS NULL
    OR array_length(filter_library_ids, 1) = 0
    OR d.library_id = ANY(filter_library_ids)
  )
  AND d.deleted_at IS NULL -- Ignore soft deleted documents
ORDER BY
  dc.embedding <= > query_embedding
LIMIT
  match_count;

END;

$$;

ALTER FUNCTION "public"."match_document_chunks_multi"(
  "query_embedding" "extensions"."vector",
  "filter_library_ids" "uuid" [],
  "match_count" integer
) OWNER TO "postgres";

SET
  default_tablespace = '';

SET
  default_table_access_method = "heap";

CREATE TABLE IF NOT EXISTS "public"."document_chunks" (
  "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
  "document_id" "uuid" NOT NULL,
  "content" "text" NOT NULL,
  "embedding" "extensions"."vector",
  "created_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE
  "public"."document_chunks" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."document_edits" (
  "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
  "document_id" "uuid" NOT NULL,
  "user_id" "uuid",
  "action" "text" NOT NULL,
  "created_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE
  "public"."document_edits" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."documents" (
  "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
  "library_id" "uuid" NOT NULL,
  "title" "text" NOT NULL,
  "content" "text" NOT NULL,
  "tags" "text" [] DEFAULT '{}' :: "text" [],
  "created_at" timestamp with time zone DEFAULT "now"(),
  "updated_at" timestamp with time zone DEFAULT "now"(),
  "author_ids" "uuid" [] DEFAULT '{}' :: "uuid" [],
  "deleted_at" timestamp with time zone
);

ALTER TABLE
  "public"."documents" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."libraries" (
  "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
  "name" "text" NOT NULL,
  "created_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE
  "public"."libraries" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."library_invites" (
  "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
  "library_id" "uuid" NOT NULL,
  "invite_code" "text" NOT NULL,
  "role" "public"."user_role" NOT NULL,
  "created_by" "uuid",
  "expires_at" timestamp with time zone,
  "max_uses" integer,
  "use_count" integer DEFAULT 0,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT "now"(),
  "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE
  "public"."library_invites" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."library_members" (
  "library_id" "uuid" NOT NULL,
  "user_id" "uuid" NOT NULL,
  "role" "public"."user_role" DEFAULT 'VIEWER' :: "public"."user_role" NOT NULL,
  "created_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE
  "public"."library_members" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."users" (
  "id" "uuid" NOT NULL,
  "name" "text",
  "email" "text",
  "avatar_url" "text",
  "bio" "text",
  "timezone" "text",
  "use_avatar_url" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE
  "public"."users" OWNER TO "postgres";

ALTER TABLE
  ONLY "public"."document_chunks"
ADD
  CONSTRAINT "document_chunks_pkey" PRIMARY KEY ("id");

ALTER TABLE
  ONLY "public"."document_edits"
ADD
  CONSTRAINT "document_edits_pkey" PRIMARY KEY ("id");

ALTER TABLE
  ONLY "public"."documents"
ADD
  CONSTRAINT "documents_pkey" PRIMARY KEY ("id");

ALTER TABLE
  ONLY "public"."libraries"
ADD
  CONSTRAINT "libraries_pkey" PRIMARY KEY ("id");

ALTER TABLE
  ONLY "public"."library_invites"
ADD
  CONSTRAINT "library_invites_invite_code_key" UNIQUE ("invite_code");

ALTER TABLE
  ONLY "public"."library_invites"
ADD
  CONSTRAINT "library_invites_pkey" PRIMARY KEY ("id");

ALTER TABLE
  ONLY "public"."library_members"
ADD
  CONSTRAINT "library_members_pkey" PRIMARY KEY ("library_id", "user_id");

ALTER TABLE
  ONLY "public"."users"
ADD
  CONSTRAINT "users_pkey" PRIMARY KEY ("id");

CREATE INDEX "idx_documents_library" ON "public"."documents" USING "btree" ("library_id");

CREATE INDEX "idx_documents_tags" ON "public"."documents" USING "gin" ("tags");

CREATE INDEX "idx_library_invites_library" ON "public"."library_invites" USING "btree" ("library_id");

CREATE INDEX "idx_library_members_user" ON "public"."library_members" USING "btree" ("user_id");

CREATE
OR REPLACE TRIGGER "enforce_document_limit" BEFORE
INSERT
  ON "public"."documents" FOR EACH ROW EXECUTE FUNCTION "public"."check_document_limit_trg"();

CREATE
OR REPLACE TRIGGER "enforce_library_member_limit" BEFORE
INSERT
  ON "public"."library_members" FOR EACH ROW EXECUTE FUNCTION "public"."check_library_member_limit_trg"();

CREATE
OR REPLACE TRIGGER "enforce_user_shared_library_limit" BEFORE
INSERT
  ON "public"."library_members" FOR EACH ROW
  WHEN (
    ("new"."role" <> 'OWNER' :: "public"."user_role")
  ) EXECUTE FUNCTION "public"."check_user_shared_library_limit_trg"();

ALTER TABLE
  ONLY "public"."document_chunks"
ADD
  CONSTRAINT "document_chunks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE CASCADE;

ALTER TABLE
  ONLY "public"."document_edits"
ADD
  CONSTRAINT "document_edits_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE CASCADE;

ALTER TABLE
  ONLY "public"."document_edits"
ADD
  CONSTRAINT "document_edits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE
SET
  NULL;

ALTER TABLE
  ONLY "public"."documents"
ADD
  CONSTRAINT "documents_library_id_fkey" FOREIGN KEY ("library_id") REFERENCES "public"."libraries"("id") ON DELETE CASCADE;

ALTER TABLE
  ONLY "public"."library_invites"
ADD
  CONSTRAINT "library_invites_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE
SET
  NULL;

ALTER TABLE
  ONLY "public"."library_invites"
ADD
  CONSTRAINT "library_invites_library_id_fkey" FOREIGN KEY ("library_id") REFERENCES "public"."libraries"("id") ON DELETE CASCADE;

ALTER TABLE
  ONLY "public"."library_members"
ADD
  CONSTRAINT "library_members_library_id_fkey" FOREIGN KEY ("library_id") REFERENCES "public"."libraries"("id") ON DELETE CASCADE;

ALTER TABLE
  ONLY "public"."library_members"
ADD
  CONSTRAINT "library_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

ALTER TABLE
  ONLY "public"."users"
ADD
  CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

CREATE POLICY "Editors/Admins/Owners can manage documents" ON "public"."documents" USING (
  (
    "public"."get_user_library_role"("library_id") = ANY (
      ARRAY ['OWNER'::"public"."user_role", 'ADMIN'::"public"."user_role", 'EDITOR'::"public"."user_role"]
    )
  )
);

CREATE POLICY "Editors/Admins/Owners manage chunks" ON "public"."document_chunks" USING (
  (
    EXISTS (
      SELECT
        1
      FROM
        "public"."documents" "d"
      WHERE
        (
          ("d"."id" = "document_chunks"."document_id")
          AND (
            "public"."get_user_library_role"("d"."library_id") = ANY (
              ARRAY ['OWNER'::"public"."user_role", 'ADMIN'::"public"."user_role", 'EDITOR'::"public"."user_role"]
            )
          )
        )
    )
  )
);

CREATE POLICY "Editors/Admins/Owners manage edits" ON "public"."document_edits" USING (
  (
    EXISTS (
      SELECT
        1
      FROM
        "public"."documents" "d"
      WHERE
        (
          ("d"."id" = "document_edits"."document_id")
          AND (
            "public"."get_user_library_role"("d"."library_id") = ANY (
              ARRAY ['OWNER'::"public"."user_role", 'ADMIN'::"public"."user_role", 'EDITOR'::"public"."user_role"]
            )
          )
        )
    )
  )
);

CREATE POLICY "Owners and Admins can add members to library" ON "public"."library_members" FOR
INSERT
  WITH CHECK (
    (
      ("auth"."uid"() IS NOT NULL)
      AND (
        (
          (
            SELECT
              "public"."get_user_library_role"("library_members"."library_id") AS "get_user_library_role"
          ) = ANY (
            ARRAY ['OWNER'::"public"."user_role", 'ADMIN'::"public"."user_role"]
          )
        )
        OR ("user_id" = "auth"."uid"())
      )
    )
  );

CREATE POLICY "Owners and Admins can create invites" ON "public"."library_invites" FOR
INSERT
  WITH CHECK (
    (
      ("auth"."uid"() IS NOT NULL)
      AND (
        "public"."get_user_library_role"("library_id") = ANY (
          ARRAY ['OWNER'::"public"."user_role", 'ADMIN'::"public"."user_role"]
        )
      )
    )
  );

CREATE POLICY "Owners and Admins can remove members" ON "public"."library_members" FOR DELETE USING (
  (
    "public"."get_user_library_role"("library_id") = ANY (
      ARRAY ['OWNER'::"public"."user_role", 'ADMIN'::"public"."user_role"]
    )
  )
);

CREATE POLICY "Owners and Admins can update invites" ON "public"."library_invites" FOR
UPDATE
  USING (
    (
      "public"."get_user_library_role"("library_id") = ANY (
        ARRAY ['OWNER'::"public"."user_role", 'ADMIN'::"public"."user_role"]
      )
    )
  );

CREATE POLICY "Owners and Admins can update libraries" ON "public"."libraries" FOR
UPDATE
  USING (
    (
      "public"."get_user_library_role"("id") = ANY (
        ARRAY ['OWNER'::"public"."user_role", 'ADMIN'::"public"."user_role"]
      )
    )
  );

CREATE POLICY "Owners and Admins can update member roles" ON "public"."library_members" FOR
UPDATE
  USING (
    (
      "public"."get_user_library_role"("library_id") = ANY (
        ARRAY ['OWNER'::"public"."user_role", 'ADMIN'::"public"."user_role"]
      )
    )
  );

CREATE POLICY "Owners and Admins can view and manage members" ON "public"."library_members" FOR
SELECT
  USING (
    (
      "public"."get_user_library_role"("library_id") = ANY (
        ARRAY ['OWNER'::"public"."user_role", 'ADMIN'::"public"."user_role"]
      )
    )
  );

CREATE POLICY "Owners and Admins can view invites" ON "public"."library_invites" FOR
SELECT
  USING (
    (
      "public"."get_user_library_role"("library_id") = ANY (
        ARRAY ['OWNER'::"public"."user_role", 'ADMIN'::"public"."user_role"]
      )
    )
  );

CREATE POLICY "Owners can delete libraries" ON "public"."libraries" FOR DELETE USING (
  (
    "public"."get_user_library_role"("id") = 'OWNER' :: "public"."user_role"
  )
);

CREATE POLICY "Users can create libraries" ON "public"."libraries" FOR
INSERT
  WITH CHECK (("auth"."uid"() IS NOT NULL));

CREATE POLICY "Users can update their own profile" ON "public"."users" FOR
UPDATE
  USING (("auth"."uid"() = "id"));

CREATE POLICY "Users can view all users" ON "public"."users" FOR
SELECT
  USING (true);

CREATE POLICY "Users view chunks corresponding to documents they can see" ON "public"."document_chunks" FOR
SELECT
  USING (
    (
      EXISTS (
        SELECT
          1
        FROM
          "public"."documents" "d"
        WHERE
          (
            ("d"."id" = "document_chunks"."document_id")
            AND (
              "public"."get_user_library_role"("d"."library_id") IS NOT NULL
            )
          )
      )
    )
  );

CREATE POLICY "Users view documents in their libraries" ON "public"."documents" FOR
SELECT
  USING (
    (
      "public"."get_user_library_role"("library_id") IS NOT NULL
    )
  );

CREATE POLICY "Users view edits for documents they can see" ON "public"."document_edits" FOR
SELECT
  USING (
    (
      EXISTS (
        SELECT
          1
        FROM
          "public"."documents" "d"
        WHERE
          (
            ("d"."id" = "document_edits"."document_id")
            AND (
              "public"."get_user_library_role"("d"."library_id") IS NOT NULL
            )
          )
      )
    )
  );

CREATE POLICY "Users view libraries they belong to" ON "public"."libraries" FOR
SELECT
  USING (
    (
      "public"."get_user_library_role"("id") IS NOT NULL
    )
  );

CREATE POLICY "Users view members of their libraries" ON "public"."library_members" FOR
SELECT
  USING (
    (
      "public"."get_user_library_role"("library_id") IS NOT NULL
    )
  );

ALTER TABLE
  "public"."document_chunks" ENABLE ROW LEVEL SECURITY;

ALTER TABLE
  "public"."document_edits" ENABLE ROW LEVEL SECURITY;

ALTER TABLE
  "public"."documents" ENABLE ROW LEVEL SECURITY;

ALTER TABLE
  "public"."libraries" ENABLE ROW LEVEL SECURITY;

ALTER TABLE
  "public"."library_invites" ENABLE ROW LEVEL SECURITY;

ALTER TABLE
  "public"."library_members" ENABLE ROW LEVEL SECURITY;

ALTER TABLE
  "public"."users" ENABLE ROW LEVEL SECURITY;

ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";

GRANT USAGE ON SCHEMA "public" TO "postgres";

GRANT USAGE ON SCHEMA "public" TO "anon";

GRANT USAGE ON SCHEMA "public" TO "authenticated";

GRANT USAGE ON SCHEMA "public" TO "service_role";

GRANT ALL ON TABLE "public"."document_chunks" TO "anon";

GRANT ALL ON TABLE "public"."document_chunks" TO "authenticated";

GRANT ALL ON TABLE "public"."document_chunks" TO "service_role";

GRANT ALL ON TABLE "public"."document_edits" TO "anon";

GRANT ALL ON TABLE "public"."document_edits" TO "authenticated";

GRANT ALL ON TABLE "public"."document_edits" TO "service_role";

GRANT ALL ON TABLE "public"."documents" TO "anon";

GRANT ALL ON TABLE "public"."documents" TO "authenticated";

GRANT ALL ON TABLE "public"."documents" TO "service_role";

GRANT ALL ON TABLE "public"."libraries" TO "anon";

GRANT ALL ON TABLE "public"."libraries" TO "authenticated";

GRANT ALL ON TABLE "public"."libraries" TO "service_role";

GRANT ALL ON TABLE "public"."library_invites" TO "anon";

GRANT ALL ON TABLE "public"."library_invites" TO "authenticated";

GRANT ALL ON TABLE "public"."library_invites" TO "service_role";

GRANT ALL ON TABLE "public"."library_members" TO "anon";

GRANT ALL ON TABLE "public"."library_members" TO "authenticated";

GRANT ALL ON TABLE "public"."library_members" TO "service_role";

GRANT ALL ON TABLE "public"."users" TO "anon";

GRANT ALL ON TABLE "public"."users" TO "authenticated";

GRANT ALL ON TABLE "public"."users" TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT
UPDATE
  ON SEQUENCES TO "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT
UPDATE
  ON SEQUENCES TO "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT
UPDATE
  ON SEQUENCES TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,
TRIGGER,
TRUNCATE,
MAINTAIN ON TABLES TO "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,
TRIGGER,
TRUNCATE,
MAINTAIN ON TABLES TO "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,
TRIGGER,
TRUNCATE,
MAINTAIN ON TABLES TO "service_role";

--
-- Dumped schema changes for auth and storage
--
CREATE
OR REPLACE TRIGGER "on_auth_user_created"
AFTER
INSERT
  ON "auth"."users" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user"();