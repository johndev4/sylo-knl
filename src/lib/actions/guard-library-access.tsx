import { LIBRARY_ROLES, requireLibraryRole } from './require-library-role';
import { Unauthorized } from '@/app/unauthorized/page';

/**
 * Checks library auth/authz. Redirects to /login if unauthenticated,
 * returns <Unauthorized /> if the user lacks the required role, or null if access is granted.
 */
export async function guardLibraryAccess(
  libraryId: string,
  minRole = LIBRARY_ROLES.VIEWER
) {
  const membership = await requireLibraryRole(libraryId, minRole);
  if (!membership) return <Unauthorized />;
  return null;
}
