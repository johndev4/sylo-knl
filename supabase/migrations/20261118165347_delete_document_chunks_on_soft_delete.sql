CREATE OR REPLACE FUNCTION public.delete_document_chunks_on_soft_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
	DELETE FROM public.document_chunks
	WHERE document_id = NEW.id;

	RETURN NEW;
END;
$$;

CREATE TRIGGER delete_document_chunks_on_soft_delete
	AFTER UPDATE OF deleted_at ON public.documents
	FOR EACH ROW
	WHEN (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)
	EXECUTE FUNCTION public.delete_document_chunks_on_soft_delete();
