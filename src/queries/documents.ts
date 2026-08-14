import { z } from 'zod';
import { SupabaseClient } from '@supabase/supabase-js';

// -----------------------------------------------------------------------------
// Schemas
// -----------------------------------------------------------------------------

const DocumentListItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  tags: z.array(z.string()),
  created_at: z.string(),
});

const DocumentsResultSchema = z.object({
  data: z.array(DocumentListItemSchema),
  metadata: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
  }),
});

const DocumentAuthorSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatar_url: z.string().nullable(),
});

const DocumentDetailSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  tags: z.array(z.string()),
  author_ids: z.array(z.string()),
  library_id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable(),
  authors: z.array(DocumentAuthorSchema),
});

const DocumentResultSchema = z.object({
  document: DocumentDetailSchema,
  role: z.string(),
});

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type DocumentListItem = z.infer<typeof DocumentListItemSchema>;
export type DocumentsResult = z.infer<typeof DocumentsResultSchema>;
export type DocumentAuthor = z.infer<typeof DocumentAuthorSchema>;
export type DocumentDetail = z.infer<typeof DocumentDetailSchema>;
export type DocumentResult = z.infer<typeof DocumentResultSchema>;

/**
 * Retrieves a paginated list of documents from a library with optional filtering.
 *
 * @param params - Object containing libraryId, pagination options, search term, and tag filters
 * @param supabase - Optional SupabaseClient instance. If not provided, a new browser client will be created
 */
export async function getDocuments(
  params: {
    libraryId: string;
    page?: number;
    limit?: number;
    search?: string;
    tags?: string[];
  },
  supabase?: SupabaseClient
): Promise<DocumentsResult> {
  const { libraryId, page = 1, limit = 10, search = '', tags } = params;

  if (!supabase) {
    const { createClient } = await import('@/lib/supabase/client');
    supabase = createClient();
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Unauthorized');
  }

  // Check RBAC
  const { data: membership } = await supabase
    .from('library_members')
    .select('library_id')
    .eq('library_id', libraryId)
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    throw new Error('Forbidden');
  }

  let query = supabase
    .from('documents')
    .select('id, title, tags, created_at', {
      count: 'exact',
    })
    .eq('library_id', libraryId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });

  if (search) {
    query = query.ilike('title', `%${search}%`);
  }

  if (tags && tags.length > 0) {
    query = query.contains('tags', tags);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, count, error } = await query.range(from, to);

  if (error) {
    throw error;
  }

  return DocumentsResultSchema.parse({
    data: data ?? [],
    metadata: {
      total: count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit),
    },
  });
}

/**
 * Retrieves a single document by ID with author information and user role.
 *
 * @param docId - The unique identifier of the document to retrieve
 * @param supabase - Optional SupabaseClient instance. If not provided, a new browser client will be created
 */
export async function getDocument(
  docId: string,
  supabase?: SupabaseClient
): Promise<DocumentResult> {
  if (!supabase) {
    const { createClient } = await import('@/lib/supabase/client');
    supabase = createClient();
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Unauthorized');
  }

  const { data: document, error: docError } = await supabase
    .from('documents')
    .select('*, author_ids, library_id, created_at, updated_at, deleted_at')
    .eq('id', docId)
    .single();

  if (docError || !document || document.deleted_at) {
    throw new Error('Document not found');
  }

  // Check RBAC
  const { data: membership } = await supabase
    .from('library_members')
    .select('role')
    .eq('library_id', document.library_id)
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    throw new Error('Forbidden');
  }

  let authors: DocumentAuthor[] = [];

  if (document.author_ids && document.author_ids.length > 0) {
    const { data: usersData, error: authorsError } = await supabase
      .from('users')
      .select('id, name, avatar_url')
      .in('id', document.author_ids);

    if (authorsError) {
      throw authorsError;
    }

    authors = DocumentAuthorSchema.array().parse(usersData ?? []);
  }

  return DocumentResultSchema.parse({
    document: {
      ...document,
      authors,
    },
    role: membership.role,
  });
}
