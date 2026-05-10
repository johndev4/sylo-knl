set check_function_bodies = off;

-- Drop first to allow changing the return table signature
DROP FUNCTION IF EXISTS public.match_document_chunks_multi(extensions.vector, uuid[], integer);

CREATE OR REPLACE FUNCTION public.match_document_chunks_multi(
    query_embedding extensions.vector,
    filter_library_ids uuid[] DEFAULT NULL::uuid[],
    match_count integer DEFAULT 10
)
RETURNS TABLE(id uuid, document_id uuid, content text, similarity double precision, title text, library_name text)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) AS similarity,
    d.title,
    l.name as library_name
  FROM document_chunks dc
  JOIN documents d ON dc.document_id = d.id
  JOIN libraries l ON d.library_id = l.id
  WHERE (filter_library_ids IS NULL OR array_length(filter_library_ids, 1) = 0 OR d.library_id = ANY(filter_library_ids))
    AND d.deleted_at IS NULL -- Ignore soft deleted documents
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$function$;

