import { redirect } from 'next/navigation';
import { DocumentManager } from '@/features/documents/document-manager';
import { requireLibraryRole, LIBRARY_ROLES } from '@/lib/auth/library-role';
import { Suspense } from 'react';
import { DocumentSkeleton } from '@/features/documents/document-skeleton';

export default function NewDocumentViewPage(props: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<DocumentSkeleton />}>
      <NewDocumentViewPageContent params={props.params} />
    </Suspense>
  );
}

async function NewDocumentViewPageContent(props: {
  params: Promise<{ id: string }>;
}) {
  const { id: libraryId } = await props.params;
  const membership = await requireLibraryRole(libraryId, LIBRARY_ROLES.EDITOR);
  if (!membership) redirect(`/hub/libraries/${libraryId}/documents`);

  return (
    <DocumentManager
      key="new"
      libraryId={libraryId}
      isNew={true}
      userRole={membership.role}
    />
  );
}
