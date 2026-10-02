-- Migration to implement atomic document and chunk updates
-- This ensures that document content and its vector chunks are always in sync.

CREATE OR REPLACE FUNCTION update_document_with_chunks(
  p_doc_id UUID,
  p_title TEXT,
  p_content_json JSONB,
  p_tags TEXT[],
  p_author_ids UUID[],
  p_chunks JSONB
) RETURNS VOID AS $$
BEGIN
  -- 1. Update the document metadata
  UPDATE documents
  SET 
    title = p_title,
    content_json = p_content_json,
    tags = p_tags,
    author_ids = p_author_ids,
    updated_at = NOW()
  WHERE id = p_doc_id;

  -- 2. Remove old chunks
  DELETE FROM document_chunks
  WHERE document_id = p_doc_id;

  -- 3. Insert new chunks
  -- p_chunks is expected to be an array of objects: [{content: text, embedding: vector}]
  INSERT INTO document_chunks (document_id, content, embedding)
  SELECT 
    p_doc_id, 
    (chunk->>'content'), 
    (chunk->>'embedding')::vector
  FROM jsonb_array_elements(p_chunks) AS chunk;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
