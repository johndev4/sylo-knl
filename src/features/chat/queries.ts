/* eslint-disable @typescript-eslint/no-explicit-any */
import { SupabaseClient, User } from '@supabase/supabase-js';

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
    throw new Error('Failed to fetch libraries');
  }

  return (data ?? []).map((m: any) => ({
    id: m.library.id as string,
    name: m.library.name as string,
    role: m.role as string,
  }));
}

export async function searchChatMentions(
  libraryIds: string[],
  type: 'document' | 'tag',
  query: string,
  libraryNames: Record<string, string>,
  supabase: SupabaseClient
) {
  const normalizedQuery = query.trim();
  const uniqueLibraryIds = [...new Set(libraryIds)];
  if (!normalizedQuery || uniqueLibraryIds.length === 0) return [];

  if (type === 'document') {
    const { data, error } = await supabase
      .from('documents')
      .select('id, title, library_id')
      .in('library_id', uniqueLibraryIds)
      .is('deleted_at', null)
      .ilike('title', `%${normalizedQuery}%`)
      .order('updated_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    return (data ?? []).map((document) => ({
      type: 'document' as const,
      id: document.id,
      label: document.title,
      libraryName: libraryNames[document.library_id] ?? 'Library',
    }));
  }

  const matchingTags = new Set<string>();
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from('documents')
      .select('tags')
      .in('library_id', uniqueLibraryIds)
      .is('deleted_at', null)
      .not('tags', 'is', null)
      .order('id', { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) throw error;

    for (const document of data ?? []) {
      const tags = Array.isArray(document.tags) ? document.tags : [];
      for (const rawTag of tags) {
        if (typeof rawTag !== 'string') continue;
        const tag = rawTag.trim().toUpperCase();
        if (tag && tag.includes(normalizedQuery.toUpperCase())) {
          matchingTags.add(tag);
        }
      }
    }

    if (!data || data.length < pageSize) break;
  }

  return [...matchingTags]
    .sort()
    .slice(0, 10)
    .map((tag) => ({ type: 'tag' as const, value: tag, label: tag }));
}
