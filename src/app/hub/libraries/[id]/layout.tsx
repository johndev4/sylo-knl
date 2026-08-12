import { Suspense, type ReactNode } from 'react';
import { guardLibraryAccess } from '@/lib/actions/guard-library-access';

export default function LibraryLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="text-muted-foreground flex h-full items-center justify-center p-6 text-sm">
          Loading library…
        </div>
      }
    >
      <LibraryLayoutContent params={params}>{children}</LibraryLayoutContent>
    </Suspense>
  );
}

async function LibraryLayoutContent({
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
