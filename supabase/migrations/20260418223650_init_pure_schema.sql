-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "extensions";

-- Enums
CREATE TYPE public.user_role AS ENUM ('OWNER', 'ADMIN', 'EDITOR', 'VIEWER');

-- Users tracking (Syncing from auth.users via trigger)
CREATE TABLE public.users (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name text,
  email text,
  avatar_url text,
  bio text,
  timezone text,
  use_avatar_url boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Libraries
CREATE TABLE public.libraries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Library Members
CREATE TABLE public.library_members (
  library_id uuid REFERENCES public.libraries ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.users ON DELETE CASCADE NOT NULL,
  role user_role DEFAULT 'VIEWER'::user_role NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (library_id, user_id)
);

-- Documents
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id uuid REFERENCES public.libraries ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  tags text[] DEFAULT '{}'::text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Document Chunks for Vectors
CREATE TABLE public.document_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES public.documents ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  embedding extensions.vector,
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_library_members_user ON public.library_members(user_id);
CREATE INDEX idx_documents_tags ON public.documents USING GIN (tags);
CREATE INDEX idx_documents_library ON public.documents(library_id);

-- Constraints Enforcement (Triggers)

-- 1. Max 11 members per library (including owner)
CREATE OR REPLACE FUNCTION check_library_member_limit_trg()
RETURNS TRIGGER AS $$
DECLARE
  member_count INT;
BEGIN
  SELECT count(*) INTO member_count FROM public.library_members WHERE library_id = NEW.library_id;
  IF member_count >= 11 THEN
    RAISE EXCEPTION 'Library has reached maximum member limit of 11 (MVP Limit).';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_library_member_limit
BEFORE INSERT ON public.library_members
FOR EACH ROW EXECUTE FUNCTION check_library_member_limit_trg();

-- 2. Max 500 documents per library
CREATE OR REPLACE FUNCTION check_document_limit_trg()
RETURNS TRIGGER AS $$
DECLARE
  doc_count INT;
BEGIN
  SELECT count(*) INTO doc_count FROM public.documents WHERE library_id = NEW.library_id;
  IF doc_count >= 500 THEN
    RAISE EXCEPTION 'Library reached exact limit of 500 documents (MVP Limit).';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_document_limit
BEFORE INSERT ON public.documents
FOR EACH ROW EXECUTE FUNCTION check_document_limit_trg();

-- Auto-sync auth.users to public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, name, email, avatar_url)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ROW LEVEL SECURITY (RLS)

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.libraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

-- Users policy
CREATE POLICY "Users can view all users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Helper to check user's role in a given library
CREATE OR REPLACE FUNCTION get_user_library_role(w_id UUID)
RETURNS user_role AS $$
  SELECT role FROM public.library_members 
  WHERE library_id = w_id AND user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Library Creation RPC
CREATE OR REPLACE FUNCTION public.create_library_with_owner(w_name TEXT)
RETURNS JSONB AS $$
DECLARE
  new_w_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF w_name IS NULL OR length(trim(w_name)) = 0 THEN
    RAISE EXCEPTION 'Library name is required';
  END IF;

  INSERT INTO public.libraries (name)
  VALUES (w_name)
  RETURNING id INTO new_w_id;

  INSERT INTO public.library_members (library_id, user_id, role)
  VALUES (new_w_id, auth.uid(), 'OWNER');

  RETURN jsonb_build_object('id', new_w_id, 'name', w_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Libraries Policy
CREATE POLICY "Users view libraries they belong to" 
ON public.libraries FOR SELECT 
USING (get_user_library_role(id) IS NOT NULL);

CREATE POLICY "Users can create libraries"
ON public.libraries FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Owners and Admins can update libraries"
ON public.libraries FOR UPDATE
USING (get_user_library_role(id) IN ('OWNER', 'ADMIN'));

CREATE POLICY "Owners can delete libraries"
ON public.libraries FOR DELETE
USING (get_user_library_role(id) = 'OWNER');


-- Library Members Policy
CREATE POLICY "Users view members of their libraries"
ON public.library_members FOR SELECT 
USING (get_user_library_role(library_id) IS NOT NULL);

CREATE POLICY "Owners and Admins can view and manage members"
ON public.library_members FOR SELECT
USING (get_user_library_role(library_id) IN ('OWNER', 'ADMIN'));

CREATE POLICY "Owners and Admins can add members to library"
ON public.library_members FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND (
    -- Allow owner/admin to add members
    (SELECT get_user_library_role(library_id)) IN ('OWNER', 'ADMIN')
    OR
    -- Allow users to add themselves during space creation
    user_id = auth.uid()
  )
);

CREATE POLICY "Owners and Admins can update member roles"
ON public.library_members FOR UPDATE
USING (
  get_user_library_role(library_id) IN ('OWNER', 'ADMIN')
);

CREATE POLICY "Owners and Admins can remove members"
ON public.library_members FOR DELETE
USING (
  get_user_library_role(library_id) IN ('OWNER', 'ADMIN')
);


-- Documents Policy
CREATE POLICY "Users view documents in their libraries"
ON public.documents FOR SELECT
USING (get_user_library_role(library_id) IS NOT NULL);

CREATE POLICY "Editors/Admins/Owners can manage documents"
ON public.documents FOR ALL
USING (get_user_library_role(library_id) IN ('OWNER', 'ADMIN', 'EDITOR'));


-- Chunks Policy
CREATE POLICY "Users view chunks corresponding to documents they can see"
ON public.document_chunks FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.documents d
  WHERE d.id = document_chunks.document_id 
  AND get_user_library_role(d.library_id) IS NOT NULL
));

CREATE POLICY "Editors/Admins/Owners manage chunks"
ON public.document_chunks FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.documents d
  WHERE d.id = document_chunks.document_id AND get_user_library_role(d.library_id) IN ('OWNER', 'ADMIN', 'EDITOR')
));

-- RAG Retrieval RPC
CREATE OR REPLACE FUNCTION match_document_chunks (
  query_embedding extensions.vector,
  match_count int DEFAULT 10,
  filter_library_id UUID DEFAULT NULL
) RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  similarity float
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM document_chunks dc
  JOIN documents d ON dc.document_id = d.id
  WHERE (filter_library_id IS NULL OR d.library_id = filter_library_id)
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
