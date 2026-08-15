/* eslint-disable @typescript-eslint/no-explicit-any */
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { DocumentManager, DocumentSkeleton } from '../_components';
import { Button } from '@/components/ui/button';
import { getDocument } from '@/queries/documents';
import { createClient } from '@/lib/supabase/server';
import { randomUUID } from 'crypto';
import { getUser } from '@/lib/auth/get-user';

export default function Document({
  params,
}: {
  params: { id: string; docId: string };
}) {
  return (
    <Suspense fallback={<DocumentSkeleton />}>
      <DocumentContent params={params} />
    </Suspense>
  );
}

async function DocumentContent(props: {
  params: { id: string; docId: string };
}) {
  const params = await props.params;
  // const membership = await requireLibraryRole(params.id);
  // console.log('echo', membership);
  // if (!membership) return forbidden();

  const libraryId = params.id;
  const docId = params.docId;

  let document: any = null;
  let role: string = 'VIEWER';
  let error: string | null = null;

  try {
    const user = await getUser();

    const supabase = await createClient();
    const data = await getDocument(docId, supabase, user);
    document = data.document;
    role = data.role || 'VIEWER';
  } catch (err: any) {
    if (err.message === 'Document not found') {
      error = 'Document not found';
    } else {
      error = err.message;
    }
  }

  if (!document || error) {
    return (
      <div className="flex h-full flex-1 flex-col items-center justify-center p-8 text-center">
        <h2 className="mb-2 text-2xl font-bold">
          {error || 'Document not found'}
        </h2>
        <Button
          onClick={() => redirect(`/hub/libraries/${libraryId}/documents`)}
        >
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <DocumentManager
      key={`${docId}_${randomUUID()}`}
      libraryId={libraryId}
      isNew={false}
      initialData={{
        id: document.id,
        title: document.title,
        content: document.content,
        tags: document.tags,
        created_at: document.created_at,
        updated_at: document.updated_at,
        authors: document.authors,
      }}
      userRole={role}
    />
  );
}
