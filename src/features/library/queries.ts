/* eslint-disable @typescript-eslint/no-explicit-any */
import { SupabaseClient, User } from '@supabase/supabase-js';
import {
  InviteSchema,
  LibraryIdSchema,
  LibraryMemberListSchema,
  TagSuggestionsQuerySchema,
  UserLibraryListSchema,
} from '@/features/library/library-schema';

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
  return data?.name ?? null;
}

/**
 * Retrieves all members of a library with their user details and roles.
 *
 * @param libraryId - The unique identifier of the library
 * @param supabase - SupabaseClient instance for database operations
 */
export async function getLibraryMembers(
  libraryId: string,
  supabase: SupabaseClient
) {
  console.log(`[DEBUG] fetchLibraryMembers called for: ${libraryId}`);

  // Fetch all members with user details
  const { data: members, error } = await supabase
    .from('library_members')
    .select(
      `
      library_id,
      user_id,
      role,
      created_at,
      user:user_id(id, name, email, avatar_url, use_avatar_url)
    `
    )
    .eq('library_id', libraryId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch members:', error);
    throw new Error('Failed to fetch members');
  }

  return LibraryMemberListSchema.parse(members ?? []);
}

/**
 * Retrieves all active invites for a library. Only accessible by library owners and admins.
 *
 * @param libraryId - The unique identifier of the library
 * @param supabase - SupabaseClient instance for database operations
 */
export async function getLibraryInvites(
  libraryId: string,
  supabase: SupabaseClient
) {
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

  return InviteSchema.array().parse(invites ?? []);
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

/**
 * Returns up to {@link MAX_TAG_SUGGESTIONS} tag suggestions for a library,
 * matched (case-insensitively, substring) against the trimmed query.
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

/**
 * Returns all distinct tags associated with non-deleted documents in a library.
 *
 * @param libraryId - UUID of the library
 * @param supabase - SupabaseClient instance for database operations
 */
export async function getLibraryAllTags(
  libraryId: string,
  supabase: SupabaseClient
): Promise<string[]> {
  const parsedId = LibraryIdSchema.safeParse(libraryId);
  if (!parsedId.success) {
    throw new Error('Invalid library id');
  }

  const { data: documents, error } = await supabase
    .from('documents')
    .select('tags')
    .eq('library_id', libraryId)
    .is('deleted_at', null);

  if (error) {
    console.error('[LIBRARY ALL TAGS ERROR]', error);
    throw new Error('Failed to fetch library tags');
  }

  const seen = new Set<string>();
  for (const doc of documents ?? []) {
    const tags = Array.isArray(doc.tags) ? doc.tags : [];
    for (const raw of tags) {
      const trimmed = typeof raw === 'string' ? raw.trim().toUpperCase() : '';
      if (trimmed) {
        seen.add(trimmed);
      }
    }
  }

  return Array.from(seen).sort();
}

/**
 * Retrieves all libraries that the current user is a member of.
 *
 * @param supabase - SupabaseClient instance for database operations
 * @param user - User object containing the current user's information
 */
export async function getUserLibraries(supabase: SupabaseClient, user: User) {
  const { data, error } = await supabase
    .from('library_members')
    .select('role, library:libraries(id, name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch user libraries:', error);
    throw new Error('Failed to fetch libraries');
  }

  return UserLibraryListSchema.parse(
    (data ?? []).map((m: any) => ({
      id: m.library.id as string,
      name: m.library.name as string,
      role: m.role as string,
    }))
  );
}
