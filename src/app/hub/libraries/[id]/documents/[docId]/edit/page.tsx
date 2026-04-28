'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DocumentForm } from '@/app/hub/_components/documents/DocumentForm';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function EditDocumentPage() {
  const params = useParams();
  const libraryId = params?.id as string;
  const docId = params?.docId as string;
  const router = useRouter();

  const [document, setDocument] = useState<any>(null);
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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [docId]);

  useEffect(() => {
    fetchDocument();
  }, [fetchDocument]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
        <h2 className="mb-2 text-2xl font-bold">
          {error || 'Document not found'}
        </h2>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn mx-auto w-full max-w-5xl flex-1 px-8 py-10">
      <DocumentForm
        libraryId={libraryId}
        initialData={{
          id: document.id,
          title: document.title,
          content: document.content,
          tags: document.tags || [],
          updated_at: document.updated_at,
          created_at: document.created_at,
        }}
      />
    </div>
  );
}
