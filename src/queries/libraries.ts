/* eslint-disable @typescript-eslint/no-explicit-any */
import { SupabaseClient } from '@supabase/supabase-js';
import {
  InviteResponseSchema,
  LibraryIdSchema,
  ListLibraryMembersSchema,
  TagSuggestionsQuerySchema,
} from '@/lib/validation/library-schema';

/**
 * Retrieves the name of a library by its ID.
 *
 * @param libraryId - The unique identifier of the library to retrieve
 * @param supabase - SupabaseClient instance for database operations
 */
export async function getLibraryName(
  libraryId: string,
  supabase: SupabaseClient
) {
  const { data } = await supabase
    .from('libraries')
    .select('name')
    .eq('id', libraryId)
    .single();
  return data?.name ?? '';
}

/**
 * Retrieves all members of a library with their user details and roles.
 *
 * @param libraryId - The unique identifier of the library
 * @param supabase - SupabaseClient instance for database operations
 * @param membership - The membership object containing the user's role in the library
 */
export async function getLibraryMembers(
  libraryId: string,
  supabase: SupabaseClient,
  membership: { role: any } | null
) {
  console.log(`[DEBUG] fetchLibraryMembers called for: ${libraryId}`);

  if (!membership) throw new Error('Access denied to library');

  // Fetch all members with user details
  const { data: members, error } = await supabase
    .from('library_members')
    .select(
      `
      library_id,
      user_id,
      role,
      created_at,
      user:user_id(id, name, email, avatar_url)
    `
    )
    .eq('library_id', libraryId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch members:', error);
    throw new Error('Failed to fetch members');
  }

  return ListLibraryMembersSchema.parse(members ?? []);
}

/**
 * Retrieves all active invites for a library. Only accessible by library owners and admins.
 *
 * @param libraryId - The unique identifier of the library
 * @param supabase - SupabaseClient instance for database operations
 * @param membership - The membership object containing the user's role in the library
 */
export async function getLibraryInvites(
  libraryId: string,
  supabase: SupabaseClient,
  membership: { role: any } | null
) {
  if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
    throw new Error('Only owners and admins can view invites');
  }

  const { data: invites, error } = await supabase
    .from('library_invites')
    .select(
      `
      *,
      created_by_user:users!library_invites_created_by_fkey(id, name, email, avatar_url)
    `
    )
    .eq('library_id', libraryId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch invites:', error);
    throw new Error('Failed to fetch invites');
  }

  return InviteResponseSchema.array().parse(invites ?? []);
}

/**
 * Retrieves an overview of a library including its details, member count, and document count.
 *
 * @param libraryId - The unique identifier of the library
 * @param supabase - SupabaseClient instance for database operations
 */
export async function getLibraryOverview(
  libraryId: string,
  supabase: SupabaseClient
) {
  const [{ data: library }, { count: memberCount }, { count: documentCount }] =
    await Promise.all([
      supabase
        .from('libraries')
        .select('name, created_at')
        .eq('id', libraryId)
        .single(),
      supabase
        .from('library_members')
        .select('*', { count: 'exact', head: true })
        .eq('library_id', libraryId),
      supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('library_id', libraryId)
        .is('deleted_at', null),
    ]);

  return { library, memberCount, documentCount };
}

// ---------------------------------------------------------------------------
// Tag suggestions migrated from src/app/api/libraries/[id]/tags/route.ts
// (use these in place of GET /api/libraries/[id]/tags?q=...)
// ---------------------------------------------------------------------------

const MAX_TAG_SUGGESTIONS = 20;
const MIN_TAG_QUERY_LENGTH = 3;

/**
 * Returns up to {@link MAX_TAG_SUGGESTIONS} tag suggestions for a library,
 * matched (case-insensitively, substring) against the trimmed query.
 *
 * Replaces the deprecated `GET /api/libraries/[id]/tags?q=<query>` route.
 * Empty array returned when query length < {@link MIN_TAG_QUERY_LENGTH}.
 *
 * @param libraryId - UUID of the library to search tags within
 * @param query - Raw query string from the client (will be trimmed)
 * @param supabase - SupabaseClient instance for database operations
 */
export async function getLibraryTagSuggestions(
  libraryId: string,
  query: string,
  supabase: SupabaseClient
) {
  const parsedId = LibraryIdSchema.safeParse(libraryId);
  if (!parsedId.success) {
    throw new Error('Invalid library id');
  }

  const parsedQuery = TagSuggestionsQuerySchema.safeParse(query);
  if (!parsedQuery.success) {
    throw new Error('Invalid tag query');
  }

  const trimmedQuery = parsedQuery.data.trim();

  if (trimmedQuery.length < MIN_TAG_QUERY_LENGTH) {
    return [];
  }

  const { data: documents, error } = await supabase
    .from('documents')
    .select('tags')
    .eq('library_id', libraryId)
    .is('deleted_at', null);

  if (error) {
    console.error('[LIBRARY TAGS QUERY ERROR]', error);
    throw new Error('Failed to fetch tag suggestions');
  }

  const seen = new Set<string>();
  const suggestions: string[] = [];
  const normalizedQuery = trimmedQuery.toLowerCase();

  for (const doc of documents ?? []) {
    const tags = Array.isArray(doc.tags) ? doc.tags : [];
    for (const raw of tags) {
      const trimmed = typeof raw === 'string' ? raw.trim() : '';
      if (!trimmed) continue;

      const normalized = trimmed.toLowerCase();
      if (normalized.includes(normalizedQuery) && !seen.has(normalized)) {
        seen.add(normalized);
        suggestions.push(trimmed);
      }
    }
  }

  suggestions.sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  );

  return suggestions.slice(0, MAX_TAG_SUGGESTIONS);
}
