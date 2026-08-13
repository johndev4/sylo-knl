import { Suspense, type ReactNode } from 'react';
import { requireLibraryRole } from '@/lib/helpers/require-library-role';
import { notFound } from 'next/navigation';
import { Spinner } from '@/components/ui/spinner';

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
        <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-1 p-6 text-sm">
          <Spinner className="text-muted-foreground h-8 w-8" />
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
  const { id: libraryId } = await params;
  const membership = await requireLibraryRole(libraryId);
  if (!membership) return notFound();

  return <>{children}</>;
}
