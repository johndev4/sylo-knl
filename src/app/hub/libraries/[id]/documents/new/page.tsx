import { DocumentManager } from '@/app/hub/_components/documents/DocumentManager';

export default async function NewDocumentPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;

  return <DocumentManager key="new" libraryId={params.id} isNew={true} />;
}
