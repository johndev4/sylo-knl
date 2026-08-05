import { redirect } from 'next/navigation';
import { DocumentManager } from '@/app/hub/libraries/[id]/documents/_components/document-manager';
import {
  requireLibraryRole,
  LIBRARY_ROLES,
} from '@/lib/actions/require-library-role';

export default async function NewDocumentPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;

  const membership = await requireLibraryRole(
    params.id,
    LIBRARY_ROLES.EDITOR
  );

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
