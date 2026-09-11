import { FileText, Plus } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { requireLibraryRole } from '@/lib/auth/library-role';
import { notFound } from 'next/navigation';

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: libraryId } = await params;
  const membership = await requireLibraryRole(libraryId);
  if (!membership) return notFound();

  const isViewer = membership?.role === 'VIEWER';

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-neutral-50 p-8 dark:bg-neutral-950/50">
      <div className="mx-auto max-w-md space-y-6 text-center">
        <div className="shadow-soft-sm mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900">
          <FileText className="text-muted-foreground h-10 w-10" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            Select a Document
          </h2>
          <p className="text-muted-foreground">
            {isViewer
              ? 'Choose a document from the sidebar to view its contents.'
              : 'Choose a document from the sidebar to view or edit its contents, or create a new one to start writing.'}
          </p>
        </div>

        {!isViewer && (
          <Button
            render={
              <Link href={`/hub/libraries/${libraryId}/documents/new`}>
                <Plus className="mr-2 h-5 w-5" />
                Create New Document
              </Link>
            }
            size="lg"
            title="New Document"
          />
        )}
      </div>
    </div>
  );
}
