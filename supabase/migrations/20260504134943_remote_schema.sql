drop extension if exists "pg_net";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.check_document_limit_trg()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  doc_count INT;
BEGIN
  SELECT count(*) INTO doc_count FROM public.documents WHERE library_id = NEW.library_id;
  IF doc_count >= 500 THEN
    RAISE EXCEPTION 'Workspace reached exact limit of 500 documents (MVP Limit).';
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_library_member_limit_trg()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  member_count INT;
BEGIN
  SELECT count(*) INTO member_count FROM public.library_members WHERE library_id = NEW.library_id;
  IF member_count >= 11 THEN
    RAISE EXCEPTION 'Workspace has reached maximum member limit of 11 (MVP Limit).';
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_library_with_owner(w_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  new_w_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF w_name IS NULL OR length(trim(w_name)) = 0 THEN
    RAISE EXCEPTION 'Workspace name is required';
  END IF;

  INSERT INTO public.libraries (name)
  VALUES (w_name)
  RETURNING id INTO new_w_id;

  INSERT INTO public.library_members (library_id, user_id, role)
  VALUES (new_w_id, auth.uid(), 'OWNER');

  RETURN jsonb_build_object('id', new_w_id, 'name', w_name);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.match_document_chunks(query_embedding extensions.vector, match_count integer DEFAULT 10, filter_library_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, document_id uuid, content text, similarity double precision)
 LANGUAGE plpgsql
AS $function$
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
$function$
;


