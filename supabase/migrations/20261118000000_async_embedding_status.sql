-- Migration: Async Embedding Pipeline
-- Decouples embedding generation from document saves.
-- Chunks are saved immediately with embedding_status = 'pending'.
-- A pg_cron job calls /api/embed-pending every minute to fill them in.
--
-- NOTE: The pg_cron schedule itself is NOT registered here because the
-- target URL is environment-specific (host.docker.internal for local dev,
-- real app URL for production). Follow the Setup Guide in the plan to
-- register the schedule manually per environment.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Enable required extensions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA cron;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Add embedding_status column to document_chunks
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.document_chunks
  ADD COLUMN IF NOT EXISTS embedding_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (embedding_status IN ('pending', 'done', 'failed'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Backfill: mark existing rows as 'done' (they already have embeddings)
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE public.document_chunks
  SET embedding_status = 'done'
  WHERE embedding IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Partial index for fast pending-chunk lookups by the worker
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding_status
  ON public.document_chunks (created_at ASC)
  WHERE embedding_status = 'pending';

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Update update_document_with_chunks
--    Embedding is now optional — chunks with no embedding are inserted as
--    'pending' and will be processed by the background worker.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_document_with_chunks(
  p_doc_id      UUID,
  p_title       TEXT,
  p_content_json JSONB,
  p_tags        TEXT[],
  p_author_ids  UUID[],
  p_chunks      JSONB
) RETURNS VOID AS $$
BEGIN
  -- Update document metadata
  UPDATE documents
  SET
    title        = p_title,
    content_json = p_content_json,
    tags         = p_tags,
    author_ids   = p_author_ids,
    updated_at   = NOW()
  WHERE id = p_doc_id;

  -- Remove old chunks
  DELETE FROM document_chunks WHERE document_id = p_doc_id;

  -- Insert new chunks
  -- embedding is optional: if absent or empty string, insert NULL and mark 'pending'
  INSERT INTO document_chunks (document_id, content, embedding, embedding_status)
  SELECT
    p_doc_id,
    (chunk->>'content'),
    CASE
      WHEN (chunk->>'embedding') IS NOT NULL AND (chunk->>'embedding') <> ''
        THEN (chunk->>'embedding')::extensions.vector
      ELSE NULL
    END,
    CASE
      WHEN (chunk->>'embedding') IS NOT NULL AND (chunk->>'embedding') <> ''
        THEN 'done'
      ELSE 'pending'
    END
  FROM jsonb_array_elements(p_chunks) AS chunk;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Update match_document_chunks: exclude pending/failed chunks from search
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.match_document_chunks(
  "query_embedding" "extensions"."vector",
  "match_count"     integer DEFAULT 10,
  "filter_library_id" "uuid" DEFAULT NULL::"uuid"
) RETURNS TABLE(
  "id"          "uuid",
  "document_id" "uuid",
  "content"     "text",
  "similarity"  double precision
) LANGUAGE "plpgsql" AS $$
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
    AND d.deleted_at IS NULL
    AND dc.embedding_status = 'done'
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Update match_document_chunks_multi: exclude pending/failed chunks
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.match_document_chunks_multi(
  "query_embedding"   "extensions"."vector",
  "filter_library_ids" "uuid"[] DEFAULT NULL::"uuid"[],
  "match_count"       integer DEFAULT 10
) RETURNS TABLE(
  "id"           "uuid",
  "document_id"  "uuid",
  "content"      "text",
  "similarity"   double precision,
  "title"        "text",
  "library_name" "text"
) LANGUAGE "plpgsql" AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) AS similarity,
    d.title,
    l.name AS library_name
  FROM document_chunks dc
  JOIN documents d ON dc.document_id = d.id
  JOIN libraries l ON d.library_id = l.id
  WHERE (
      filter_library_ids IS NULL
      OR array_length(filter_library_ids, 1) = 0
      OR d.library_id = ANY(filter_library_ids)
    )
    AND d.deleted_at IS NULL
    AND dc.embedding_status = 'done'
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Update match_document_chunks_scoped: exclude pending/failed chunks
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.match_document_chunks_scoped(
  query_embedding    extensions.vector,
  filter_library_ids uuid[]  DEFAULT NULL,
  filter_document_ids uuid[] DEFAULT NULL,
  filter_tags        text[]  DEFAULT NULL,
  match_count        integer DEFAULT 5
) RETURNS TABLE(
  id           uuid,
  document_id  uuid,
  content      text,
  similarity   double precision,
  title        text,
  library_name text
) LANGUAGE sql STABLE AS $$
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) AS similarity,
    d.title,
    l.name AS library_name
  FROM public.document_chunks dc
  JOIN public.documents  d ON d.id  = dc.document_id
  JOIN public.libraries  l ON l.id  = d.library_id
  WHERE (
    filter_library_ids IS NULL
    OR cardinality(filter_library_ids) = 0
    OR d.library_id = ANY(filter_library_ids)
  )
  AND d.deleted_at IS NULL
  AND dc.embedding_status = 'done'
  AND (
    (
      COALESCE(cardinality(filter_document_ids), 0) = 0
      AND COALESCE(cardinality(filter_tags), 0) = 0
    )
    OR (
      COALESCE(cardinality(filter_document_ids), 0) > 0
      AND d.id = ANY(filter_document_ids)
    )
    OR (
      COALESCE(cardinality(filter_tags), 0) > 0
      AND EXISTS (
        SELECT 1
        FROM unnest(d.tags) AS document_tag
        WHERE lower(document_tag) = ANY (
          SELECT lower(selected_tag)
          FROM unnest(filter_tags) AS selected_tag
        )
      )
    )
  )
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
$$;
