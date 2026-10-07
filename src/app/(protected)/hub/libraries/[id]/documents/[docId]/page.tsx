/* eslint-disable @typescript-eslint/no-explicit-any */
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import {
  DocumentManager,
  DocumentSkeleton,
} from '@/features/library/document/components';
import { Button } from '@/components/ui/button';
import { getDocument } from '@/features/library/document/queries';
import { createClient } from '@/lib/supabase/server';
import { randomUUID } from 'crypto';
import { getUser } from '@/lib/auth/get-user';
import { requireLibraryRole } from '@/lib/auth/library-role';
import Link from 'next/link';

import {
  BlockNotePartialBlocksSchema,
  type BlockNotePartialBlocks,
} from '@/lib/blocknote/config';

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string; docId: string }>;
}) {
  const { id: libraryId, docId } = await params;
  const membership = await requireLibraryRole(libraryId);
  if (!membership) return notFound();

  return (
    <Suspense fallback={<DocumentSkeleton />}>
      <DocumentPageWrapper
        libraryId={libraryId}
        docId={docId}
        userRole={membership.role}
      />
    </Suspense>
  );
}

async function DocumentPageWrapper({
  libraryId,
  docId,
  userRole,
}: {
  libraryId: string;
  docId: string;
  userRole: string;
}) {
  const user = await getUser();
  let document: any = null;
  let error: string | null = null;

  try {
    const supabase = await createClient();
    const data = await getDocument(docId, supabase, user);
    document = data?.document ?? null;
  } catch (err: any) {
    error = err.message;
  }

  if (!document || error) {
    return (
      <div className="flex h-full flex-1 flex-col items-center justify-center p-8 text-center">
        <h2 className="mb-2 text-2xl font-bold">
          {error || 'An error occurred. Please try again.'}
        </h2>
        <Link href={`/hub/libraries/${libraryId}`} role="button">
          <Button>Go Back</Button>
        </Link>
      </div>
    );
  }

  const contentJson: BlockNotePartialBlocks =
    BlockNotePartialBlocksSchema.parse(document.content_json ?? []);

  return (
    <DocumentManager
      key={`${docId}_${randomUUID()}`}
      libraryId={libraryId}
      isNew={false}
      initialData={{
        id: document.id,
        title: document.title,
        contentJson,
        tags: document.tags,
        created_at: document.created_at,
        updated_at: document.updated_at,
        authors: document.authors,
      }}
      userRole={userRole}
      currentUserId={user.id}
    />
  );
}
