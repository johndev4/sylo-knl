ALTER TABLE public.documents
ADD COLUMN content_json jsonb;

ALTER TABLE public.documents
ALTER COLUMN content DROP NOT NULL;

ALTER TABLE public.documents
ADD CONSTRAINT documents_content_json_array_check
CHECK (
	content_json IS NULL
	OR jsonb_typeof(content_json) = 'array'
);
