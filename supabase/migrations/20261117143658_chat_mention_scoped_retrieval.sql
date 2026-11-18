CREATE OR REPLACE FUNCTION public.match_document_chunks_scoped(
	query_embedding extensions.vector,
	filter_library_ids uuid[] DEFAULT NULL,
	filter_document_ids uuid[] DEFAULT NULL,
	filter_tags text[] DEFAULT NULL,
	match_count integer DEFAULT 5
)
RETURNS TABLE(
	id uuid,
	document_id uuid,
	content text,
	similarity double precision,
	title text,
	library_name text
)
LANGUAGE sql
STABLE
AS $$
	SELECT
		dc.id,
		dc.document_id,
		dc.content,
		1 - (dc.embedding <=> query_embedding) AS similarity,
		d.title,
		l.name AS library_name
	FROM public.document_chunks dc
	JOIN public.documents d ON d.id = dc.document_id
	JOIN public.libraries l ON l.id = d.library_id
	WHERE
		(
			filter_library_ids IS NULL
			OR cardinality(filter_library_ids) = 0
			OR d.library_id = ANY(filter_library_ids)
		)
		AND d.deleted_at IS NULL
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
