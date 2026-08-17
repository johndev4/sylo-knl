import {
  DocumentsResult,
  DocumentsResultSchema,
  DocumentResult,
  DocumentAuthor,
  DocumentAuthorSchema,
  DocumentResultSchema,
} from '@/lib/validation/document-schema';
import { SupabaseClient, User } from '@supabase/supabase-js';

/**
 * Retrieves a paginated list of documents from a library with optional filtering.
 *
 * @param params - Object containing libraryId, pagination options, search term, and tag filters
 * @param supabase - SupabaseClient instance for database operations
 * @param user - User object containing the current user's information
 */
export async function getDocuments(
  params: {
    libraryId: string;
    page?: number;
    limit?: number;
    search?: string;
    tags?: string[];
  },
  supabase: SupabaseClient,
  user: User
): Promise<DocumentsResult> {
  const { libraryId, page = 1, limit = 10, search = '', tags } = params;

  // Check RBAC
  const { data: membership } = await supabase
    .from('library_members')
    .select('library_id')
    .eq('library_id', libraryId)
    .eq('user_id', user.id)
    .maybeSingle();

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
 * @param supabase - SupabaseClient instance for database operations
 * @param user - User object containing the current user's information
 */
export async function getDocument(
  docId: string,
  supabase: SupabaseClient,
  user: User
): Promise<DocumentResult> {
  const { data: document, error: docError } = await supabase
    .from('documents')
    .select('*, author_ids, library_id, created_at, updated_at, deleted_at')
    .eq('id', docId)
    .maybeSingle();

  if (docError) {
    throw new Error(`Server Error: ${docError.message}`);
  } else if (!document || document.deleted_at) {
    throw new Error('Document not found');
  }

  // Check RBAC
  const { data: membership } = await supabase
    .from('library_members')
    .select('role')
    .eq('library_id', document.library_id)
    .eq('user_id', user.id)
    .maybeSingle();

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
  });
}
