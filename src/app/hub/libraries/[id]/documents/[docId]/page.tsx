import { Suspense } from 'react';
import { unauthorized } from 'next/navigation';
import { requireLibraryRole } from '@/lib/helpers/require-library-role';
import { DocumentViewClient } from '../_components/document-view-client';
import { DocumentSkeleton } from '../_components';

export default function DocumentView(props: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<DocumentSkeleton />}>
      <DocumentViewGuard params={props.params} />
    </Suspense>
  );
}

async function DocumentViewGuard(props: { params: Promise<{ id: string }> }) {
  const { id: libraryId } = await props.params;
  const membership = await requireLibraryRole(libraryId);
  if (!membership) return unauthorized();

  return <DocumentViewClient />;
}
