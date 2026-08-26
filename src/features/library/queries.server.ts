import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { cache } from 'react';
import { getLibraryName } from './queries';

/**
 * Retrieves the name of a library by its ID with React cache integration.
 *
 * @param libraryId - The unique identifier of the library to retrieve
 * @param supabase - SupabaseClient instance for database operations
 */
export const getCachedLibraryName = cache(async (libraryId: string) => {
  const supabase = await createClient();
  return await getLibraryName(libraryId, supabase);
});
