import { createClient } from '@/lib/supabase/server';
import { getUser } from './get-user';
import { cache } from 'react';

// RBAC roles
export const LIBRARY_ROLES = {
  VIEWER: 0,
  EDITOR: 1,
  ADMIN: 2,
  OWNER: 3,
};

/**
 * Returns the library membership if the user is authorized, or null if not.
 * @param libraryId string
 * @param minRole number (0=VIEWER, 1=EDITOR, 2=ADMIN, 3=OWNER)
 */
export const requireLibraryRole = cache(
  async (libraryId: string, minRole = LIBRARY_ROLES.VIEWER) => {
    const user = await getUser();

    // Special bypass for E2E tests using the zero-UUID.
    // This allows tests to run without a seeded database by mocking the UI state.
    // if (libraryId === '00000000-0000-0000-0000-000000000000') {
    //   return { role: 'OWNER' };
    // }

    const supabase = await createClient();
    const { data: membership } = await supabase
      .from('library_members')
      .select('role')
      .eq('library_id', libraryId)
      .eq('user_id', user.id)
      .single();

    if (!membership || typeof membership.role !== 'string') {
      return null;
    }

    const roleMap = { VIEWER: 0, EDITOR: 1, ADMIN: 2, OWNER: 3 };
    const userRole = roleMap[membership.role as keyof typeof roleMap];
    if (userRole === undefined || userRole < minRole) {
      return null;
    }

    return membership;
  }
);
