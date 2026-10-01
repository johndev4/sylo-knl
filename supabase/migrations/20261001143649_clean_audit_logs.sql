-- Move DOCUMENT_ related actions from audit_logs to document_edits
-- This ensures audit_logs remains a clean security/admin record.
INSERT INTO public.document_edits (document_id, user_id, action)
SELECT 
    target_id::uuid, 
    actor_id, 
    CASE 
        WHEN action = 'DOCUMENT_CREATED' THEN 'CREATED'
        WHEN action = 'DOCUMENT_UPDATED' THEN 'UPDATED'
        WHEN action = 'DOCUMENT_DELETED' THEN 'DELETED'
        ELSE 'UPDATED' 
    END
FROM public.audit_logs
WHERE action LIKE 'DOCUMENT_%';

-- Remove document actions from audit_logs
DELETE FROM public.audit_logs
WHERE action LIKE 'DOCUMENT_%';

-- Remove the trigger that was causing document deletions to be logged in public.audit_logs.
-- These events are now handled by the document_edits trigger for atomicity and separation of concerns.
DROP TRIGGER IF EXISTS audit_document_changes ON public.documents;
DROP FUNCTION IF EXISTS public.audit_document_changes_trg();

