/* eslint-disable @typescript-eslint/no-explicit-any */
import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import {
  DocumentManager,
  DocumentSkeleton,
} from '@/components/features/documents';
import { Button } from '@/components/ui/button';
import { getDocument } from '@/queries/documents';
import { createClient } from '@/lib/supabase/server';
import { randomUUID } from 'crypto';
import { getUser } from '@/lib/auth/get-user';
import { requireLibraryRole } from '@/lib/auth/library-role';

export default function Document({
  params,
}: {
  params: Promise<{ id: string; docId: string }>;
}) {
  return (
    <Suspense fallback={<DocumentSkeleton />}>
      <DocumentContent params={params} />
    </Suspense>
  );
}

async function DocumentContent({
  params,
}: {
  params: Promise<{ id: string; docId: string }>;
}) {
  const { id: libraryId, docId } = await params;
  const membership = await requireLibraryRole(libraryId);
  if (!membership) return notFound();

  let document: any = null;
  let error: string | null = null;

  try {
    const user = await getUser();
    const supabase = await createClient();
    const data = await getDocument(docId, supabase, user);
    document = data.document;
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
      userRole={membership.role}
    />
  );
}
