-- Migration to support soft delete, multiple authors, and edit auditing

-- Add multiple authors support
ALTER TABLE public.documents ADD COLUMN author_ids UUID[] DEFAULT '{}'::UUID[];

-- Add soft delete flag
ALTER TABLE public.documents ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Create Document Edits audit table
CREATE TABLE public.document_edits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users ON DELETE SET NULL,
  action TEXT NOT NULL, -- e.g., 'CREATED', 'UPDATED'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for document_edits
ALTER TABLE public.document_edits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view edits for documents they can see"
ON public.document_edits FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.documents d
  WHERE d.id = document_edits.document_id 
  AND get_user_library_role(d.library_id) IS NOT NULL
));

CREATE POLICY "Editors/Admins/Owners manage edits"
ON public.document_edits FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.documents d
  WHERE d.id = document_edits.document_id AND get_user_library_role(d.library_id) IN ('OWNER', 'ADMIN', 'EDITOR')
));

-- Update the Match Document Chunks RPC to ignore soft-deleted documents
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
    AND d.deleted_at IS NULL -- Ignore soft deleted documents
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
