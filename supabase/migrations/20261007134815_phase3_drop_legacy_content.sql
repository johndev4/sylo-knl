-- Phase 3: Cleanup – Final State
-- Removes the legacy `content` column and enforces NOT NULL on `content_json`.
--
-- Prerequisites (already deployed):
--   Phase 1: content_json column added (nullable), editor writes to content_json.
--   Phase 2: Backfill script populated content_json for all active documents.
--
-- 1. Purge soft-deleted documents (which were omitted from backfill).
--    Foreign keys on `document_chunks` and `document_edits` have ON DELETE CASCADE,
--    so orphaned embeddings and edit history will be automatically cleaned up.
DELETE FROM public.documents
WHERE deleted_at IS NOT NULL;

-- 2. Drop the legacy content column (and its implicit constraints).
ALTER TABLE public.documents
DROP COLUMN content;

-- 3. Enforce NOT NULL on content_json to match the canonical state.
ALTER TABLE public.documents
ALTER COLUMN content_json SET NOT NULL;
