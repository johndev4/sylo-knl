-- Implementation of automatic logging for document edits to ensure transaction atomicity.
-- This replaces manual inserts in server actions.

-- 1. Create the trigger function
CREATE OR REPLACE FUNCTION public.handle_document_edit_logging()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.document_edits (document_id, user_id, action)
    VALUES (NEW.id, auth.uid(), 'CREATED');
  ELSIF (TG_OP = 'UPDATE') THEN
    -- Only log if the document was actually modified or soft-deleted
    -- We check if content_json or title changed, or if it was just soft-deleted
    IF (OLD.content_json IS DISTINCT FROM NEW.content_json OR 
        OLD.title IS DISTINCT FROM NEW.title OR 
        (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)) THEN
        
        INSERT INTO public.document_edits (document_id, user_id, action)
        VALUES (NEW.id, auth.uid(), 
               CASE 
                 WHEN (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL) THEN 'DELETED'
                 ELSE 'UPDATED'
               END);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 2. Create the trigger on the documents table
DROP TRIGGER IF EXISTS trigger_document_edit_logging ON public.documents;
CREATE TRIGGER trigger_document_edit_logging
  AFTER INSERT OR UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_document_edit_logging();

-- 3. Create index on document_edits for query performance and RLS evaluations
CREATE INDEX IF NOT EXISTS idx_document_edits_document_id_created_at
  ON public.document_edits (document_id, created_at DESC);

