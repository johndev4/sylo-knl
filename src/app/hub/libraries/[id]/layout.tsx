import { ReactNode } from 'react';
import { requireLibraryRole } from '@/lib/actions/requireLibraryRole';
import { Unauthorized } from '@/app/unauthorized/page';

export default async function LibraryLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Require at least VIEWER role to access any library route
  const membership = await requireLibraryRole(id);
  if (!membership) {
    return <Unauthorized />;
  }

  return <>{children}</>;
}
