'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Calendar, Clock, Users, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function DocumentDetailsPage() {
  const params = useParams();
  const libraryId = params?.id as string;
  const docId = params?.docId as string;
  const router = useRouter();

  const [document, setDocument] = useState<any>(null);
  const [authors, setAuthors] = useState<any[]>([]);
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
      setAuthors(data.document.authors || []);
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
    <div className="animate-fadeIn flex h-full flex-col overflow-hidden">
      {/* Top Sticky Header */}
      <div className="bg-background/80 z-20 flex shrink-0 items-center justify-between px-8 py-4 backdrop-blur-sm">
        <h1 className="text-foreground mr-4 truncate text-3xl font-bold tracking-tight">
          {document.title}
        </h1>
        <Button
          asChild
          variant="secondary"
          size="sm"
          className="rounded-lg px-4 shadow-sm"
        >
          <Link href={`/hub/${libraryId}/documents/${docId}/edit`}>
            <Edit className="mr-2 h-4 w-4" /> Edit
          </Link>
        </Button>
      </div>

      {/* Scrollable Content Area */}
      <div className="scrollbar-hide flex-1 overflow-y-auto px-8 pb-20">
        <div className="max-w-4xl">
          {/* Metadata section */}
          <div className="text-muted-foreground/60 mb-6 flex flex-wrap items-center gap-x-8 gap-y-3 text-[11px] font-medium tracking-wider uppercase">
            <div className="flex items-center">
              <Calendar className="mr-2 h-3.5 w-3.5" />
              CREATED:{' '}
              <span className="text-muted-foreground ml-1">
                {new Date(document.created_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
            <div className="flex items-center">
              <Clock className="mr-2 h-3.5 w-3.5" />
              MODIFIED:{' '}
              <span className="text-muted-foreground ml-1">
                {new Date(document.updated_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
            {authors.length > 0 && (
              <div className="flex items-center">
                <Users className="mr-2 h-3.5 w-3.5" />
                AUTHORS:{' '}
                <span className="text-muted-foreground ml-1 uppercase">
                  {authors.map((a: any) => a.name).join(', ')}
                </span>
              </div>
            )}
          </div>

          {/* Tags section */}
          {document.tags && document.tags.length > 0 && (
            <div className="mb-10 flex flex-wrap gap-2">
              {document.tags.map((tag: string) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-muted-foreground hover:text-foreground rounded-full border-none bg-zinc-100 px-3 py-0.5 text-[10px] transition-colors dark:bg-zinc-900"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Content area */}
          <div className="prose dark:prose-invert max-w-none pb-20">
            {/* <MarkdownViewer content={document.content} /> */}
          </div>
        </div>
      </div>
    </div>
  );
}
