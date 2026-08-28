import { redirect } from 'next/navigation';
import { DocumentManager } from '@/features/library/document/components/document-manager';
import { requireLibraryRole, LIBRARY_ROLES } from '@/lib/auth/library-role';
import { Suspense } from 'react';
import { DocumentSkeleton } from '@/features/library/document/components';

export default async function NewDocumentPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id: libraryId } = await props.params;
  const membership = await requireLibraryRole(libraryId, LIBRARY_ROLES.EDITOR);
  if (!membership) redirect(`/hub/libraries/${libraryId}/documents`);

  return (
    <Suspense fallback={<DocumentSkeleton />}>
      <DocumentManager
        key="new"
        libraryId={libraryId}
        isNew={true}
        userRole={membership.role}
      />
    </Suspense>
  );
}
