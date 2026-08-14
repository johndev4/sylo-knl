/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { DocumentManager } from '@/app/hub/libraries/[id]/documents/_components/document-manager';
import { DocumentSkeleton } from './document-skeleton';
import { getDocument } from '@/queries/documents';

export function DocumentViewClient() {
  const params = useParams();
  const libraryId = params?.id as string;
  const docId = params?.docId as string;
  const router = useRouter();

  const [document, setDocument] = useState<any>(null);
  const [role, setRole] = useState<string>('VIEWER');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocument = useCallback(async () => {
    if (!docId) return;
    setIsLoading(true);
    try {
      const data = await getDocument(docId);
      setDocument(data.document);
      setRole(data.role || 'VIEWER');
    } catch (err: any) {
      if (err.message === 'Document not found') {
        setError('Document not found');
      } else {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [docId]);

  useEffect(() => {
    (async () => fetchDocument())();
  }, [fetchDocument]);

  if (isLoading) {
    return <DocumentSkeleton />;
  }

  if (error || !document) {
    return (
      <div className="flex h-full flex-1 flex-col items-center justify-center p-8 text-center">
        <h2 className="mb-2 text-2xl font-bold">
          {error || 'Document not found'}
        </h2>
        <Button
          onClick={() => router.push(`/hub/libraries/${libraryId}/documents`)}
        >
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <DocumentManager
      key={docId}
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
