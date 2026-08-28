/* eslint-disable @typescript-eslint/no-explicit-any */
import { SupabaseClient, User } from '@supabase/supabase-js';
import { HubDataSchema } from './hub-schema';

/**
 * Fetches all library memberships for a user, along with member and document counts
 * @param supabase Supabase client instance
 * @param user The current user
 */
export async function getHubData(supabase: SupabaseClient, user: User) {
  // Fetch libraries user is a member of with counts
  const { data: libraryMemberships } = await supabase
    .from('library_members')
    .select('role, library:libraries ( id, name, created_at )')
    .eq('user_id', user.id);

  // Fetch member counts and document counts for each library
  const libraryIds = (libraryMemberships || []).map((m: any) => m.library.id);

  let memberCounts: Record<string, number> = {};
  let docCounts: Record<string, number> = {};

  if (libraryIds.length > 0) {
    // Get member counts
    const { data: memberCountData } = await supabase
      .from('library_members')
      .select('library_id')
      .in('library_id', libraryIds);

    memberCounts = (memberCountData || []).reduce(
      (acc: Record<string, number>, item: any) => {
        acc[item.library_id] = (acc[item.library_id] || 0) + 1;
        return acc;
      },
      {}
    );

    // Get document counts
    const { data: docCountData } = await supabase
      .from('documents')
      .select('library_id')
      .in('library_id', libraryIds);

    docCounts = (docCountData || []).reduce(
      (acc: Record<string, number>, item: any) => {
        acc[item.library_id] = (acc[item.library_id] || 0) + 1;
        return acc;
      },
      {}
    );
  }

  return HubDataSchema.parse(
    (libraryMemberships || []).map((m: any) => ({
      role: m.role,
      library: m.library,
      memberCount: memberCounts[m.library.id] || 0,
      docCount: docCounts[m.library.id] || 0,
    }))
  );
}
