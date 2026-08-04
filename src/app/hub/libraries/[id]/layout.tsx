import { ReactNode } from 'react';
import { guardLibraryAccess } from '@/lib/actions/guard-library-access';

export default async function LibraryLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const denied = await guardLibraryAccess(id);
  if (denied) return denied;

  return <>{children}</>;
}
