CREATE INDEX IF NOT EXISTS idx_document_chunks_content_fts
  ON public.document_chunks USING gin (to_tsvector('simple', content));

CREATE INDEX IF NOT EXISTS idx_documents_title_fts
  ON public.documents USING gin (to_tsvector('simple', title));

CREATE OR REPLACE FUNCTION public.search_document_chunks_keywords(
  search_query text,
  filter_library_ids uuid[] DEFAULT NULL,
  filter_document_ids uuid[] DEFAULT NULL,
  filter_tags text[] DEFAULT NULL,
  match_count integer DEFAULT 12
)
RETURNS TABLE(
  id uuid,
  document_id uuid,
  content text,
  similarity double precision,
  title text,
  library_name text,
  tags text[]
)
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  WITH search_terms AS (
    SELECT DISTINCT term
    FROM regexp_split_to_table(
      lower(coalesce(search_query, '')),
      '[^[:alnum:]]+'
    ) AS terms(term)
    WHERE length(term) > 1
  ),
  parsed_query AS (
    SELECT to_tsquery(
      'simple',
      string_agg(quote_literal(term), ' | ')
    ) AS query
    FROM search_terms
  ),
  ranked_chunks AS (
    SELECT
      dc.id,
      dc.document_id,
      dc.content,
      d.title,
      l.name AS library_name,
      coalesce(d.tags, '{}'::text[]) AS tags,
      ts_rank_cd(
        setweight(to_tsvector('simple', d.title), 'A')
        || setweight(
          to_tsvector('simple', array_to_string(coalesce(d.tags, '{}'::text[]), ' ')),
          'A'
        )
        || setweight(to_tsvector('simple', dc.content), 'B'),
        parsed_query.query
      ) AS rank
    FROM public.document_chunks dc
    JOIN public.documents d ON d.id = dc.document_id
    JOIN public.libraries l ON l.id = d.library_id
    CROSS JOIN parsed_query
    WHERE parsed_query.query IS NOT NULL
      AND d.deleted_at IS NULL
      AND (
        filter_library_ids IS NULL
        OR cardinality(filter_library_ids) = 0
        OR d.library_id = ANY(filter_library_ids)
      )
      AND (
        (
          coalesce(cardinality(filter_document_ids), 0) = 0
          AND coalesce(cardinality(filter_tags), 0) = 0
        )
        OR (
          coalesce(cardinality(filter_document_ids), 0) > 0
          AND d.id = ANY(filter_document_ids)
        )
        OR (
          coalesce(cardinality(filter_tags), 0) > 0
          AND EXISTS (
            SELECT 1
            FROM unnest(d.tags) AS document_tags(tag)
            WHERE lower(document_tags.tag) = ANY (
              SELECT lower(selected_tags.tag)
              FROM unnest(filter_tags) AS selected_tags(tag)
            )
          )
        )
      )
      AND (
        to_tsvector('simple', dc.content) @@ parsed_query.query
        OR to_tsvector('simple', d.title) @@ parsed_query.query
        OR to_tsvector(
          'simple',
          array_to_string(coalesce(d.tags, '{}'::text[]), ' ')
        ) @@ parsed_query.query
      )
  )
  SELECT
    ranked_chunks.id,
    ranked_chunks.document_id,
    ranked_chunks.content,
    least(0.99, 0.65 + ranked_chunks.rank)::double precision AS similarity,
    ranked_chunks.title,
    ranked_chunks.library_name,
    ranked_chunks.tags
  FROM ranked_chunks
  ORDER BY ranked_chunks.rank DESC
  LIMIT match_count;
$$;

REVOKE ALL ON FUNCTION public.search_document_chunks_keywords(
  text,
  uuid[],
  uuid[],
  text[],
  integer
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.search_document_chunks_keywords(
  text,
  uuid[],
  uuid[],
  text[],
  integer
) TO authenticated;