-- Migration: Add match_document_chunks_by_tags function for keyword search on document tags
-- Allows retrieving chunks from documents matching specific tags (case-insensitive)

CREATE OR REPLACE FUNCTION "public"."match_document_chunks_by_tags"(
  "filter_library_ids" "uuid" [] DEFAULT NULL :: "uuid" [],
  "filter_tags" "text" [] DEFAULT NULL :: "text" [],
  "match_count" integer DEFAULT 5
) RETURNS TABLE(
  "id" "uuid",
  "document_id" "uuid",
  "content" "text",
  "similarity" double precision,
  "title" "text",
  "library_name" "text"
) LANGUAGE "plpgsql" AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    0.95::double precision AS similarity,
    d.title,
    l.name as library_name
  FROM
    documents d
    JOIN libraries l ON d.library_id = l.id
    JOIN document_chunks dc ON dc.document_id = d.id
  WHERE
    (
      filter_library_ids IS NULL
      OR array_length(filter_library_ids, 1) = 0
      OR d.library_id = ANY(filter_library_ids)
    )
    AND d.deleted_at IS NULL
    AND filter_tags IS NOT NULL
    AND array_length(filter_tags, 1) > 0
    AND (
      EXISTS (
        SELECT 1 FROM unnest(d.tags) t
        WHERE lower(t) = ANY(
          SELECT lower(ft) FROM unnest(filter_tags) ft
        )
      )
    )
  ORDER BY
    d.updated_at DESC,
    dc.created_at ASC
  LIMIT match_count;
END;
$$;

ALTER FUNCTION "public"."match_document_chunks_by_tags"(
  "filter_library_ids" "uuid" [],
  "filter_tags" "text" [],
  "match_count" integer
) OWNER TO "postgres";
