import { redirect } from 'next/navigation';
import { DocumentManager } from '@/app/hub/libraries/[id]/documents/_components/document-manager';
import {
  requireLibraryRole,
  LIBRARY_ROLES,
} from '@/lib/helpers/require-library-role';
import { Suspense } from 'react';
import { DocumentSkeleton } from '@/app/hub/libraries/[id]/documents/_components/document-skeleton';

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
  const params = await props.params;
  const membership = await requireLibraryRole(params.id, LIBRARY_ROLES.EDITOR);
  if (!membership) redirect(`/hub/libraries/${params.id}/documents`);

  return (
    <DocumentManager
      key="new"
      libraryId={params.id}
      isNew={true}
      userRole={membership.role}
    />
  );
}
