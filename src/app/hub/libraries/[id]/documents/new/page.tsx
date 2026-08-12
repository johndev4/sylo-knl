import { redirect } from 'next/navigation';
import { DocumentManager } from '@/app/hub/libraries/[id]/documents/_components/document-manager';
import {
  requireLibraryRole,
  LIBRARY_ROLES,
} from '@/lib/actions/require-library-role';
import { Suspense } from 'react';
import { Spinner } from '@/components/ui/spinner';

export default function NewDocumentViewPage(props: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex h-full flex-1 items-center justify-center">
          <Spinner className="text-muted-foreground h-8 w-8" />
        </div>
      }
    >
      <NewDocumentViewPageContent params={props.params} />
    </Suspense>
  );
}

async function NewDocumentViewPageContent(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;

  const membership = await requireLibraryRole(params.id, LIBRARY_ROLES.EDITOR);

  if (!membership) {
    redirect(`/hub/libraries/${params.id}/documents`);
  }

  return (
    <DocumentManager
      key="new"
      libraryId={params.id}
      isNew={true}
      userRole={membership.role}
    />
  );
}
