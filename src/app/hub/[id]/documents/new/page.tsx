import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { DocumentForm } from '@/components/documents/DocumentForm';

export default async function NewDocumentPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-8 py-10">
      <DocumentForm libraryId={params.id} />
    </div>
  );
}
