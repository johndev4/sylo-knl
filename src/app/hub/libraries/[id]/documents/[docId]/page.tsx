'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DocumentManager } from '@/app/hub/_components/documents/DocumentManager';

export default function DocumentDetailsPage() {
  const params = useParams();
  const libraryId = params?.id as string;
  const docId = params?.docId as string;
  const router = useRouter();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [document, setDocument] = useState<any>(null);
  const [role, setRole] = useState<string>('VIEWER');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocument = useCallback(async () => {
    if (!docId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/documents/${docId}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError('Document not found');
        } else {
          throw new Error('Failed to fetch document');
        }
        return;
      }
      const data = await res.json();
      setDocument(data.document);
      setRole(data.role || 'VIEWER');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [docId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDocument();
  }, [fetchDocument]);

  if (isLoading) {
    return (
      <div className="flex h-full flex-1 items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="flex h-full flex-1 flex-col items-center justify-center p-8 text-center">
        <h2 className="mb-2 text-2xl font-bold">
          {error || 'Document not found'}
        </h2>
        <Button onClick={() => router.back()}>Go Back</Button>
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
