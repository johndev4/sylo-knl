'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Clock,
  Users,
  X,
  Save,
  Loader2,
  Edit,
  Eye,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useSidebarRefresh } from './sidebar-refresh-context';
import dynamic from 'next/dynamic';
const Editor = dynamic(() => import('./block_editor/editor'), { ssr: false });
import { useNavigationGuard } from '@/lib/hooks/use-navigation-guard';

interface DocumentManagerProps {
  libraryId: string;
  isNew?: boolean;
  initialData?: {
    id: string;
    title: string;
    content: string;
    tags: string[];
    updated_at: string;
    created_at?: string;
    authors?: { id: string; name: string }[];
  };
  userRole?: string;
}

export function DocumentManager({
  libraryId,
  isNew = false,
  initialData,
  userRole: initialUserRole = 'VIEWER',
}: DocumentManagerProps) {
  const router = useRouter();
  const { triggerRefresh } = useSidebarRefresh();

  const [isEditMode, setIsEditMode] = useState(isNew);
  const [title, setTitle] = useState(initialData?.title || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [tags, setTags] = useState<string[]>(
    (initialData?.tags || []).map((t) => t.toUpperCase())
  );
  const [tagInput, setTagInput] = useState('');
  const [editorResetKey, setEditorResetKey] = useState(0);

  // Track the most recently saved updated_at so the OCC check
  // always sends the current server timestamp (not the stale prop).
  const latestUpdatedAt = useRef<string>(initialData?.updated_at || '');

  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ignoreNavigationGuard, setIgnoreNavigationGuard] = useState(false);

  // Derive if document is dirty
  const isDirty = useMemo(() => {
    // For new documents, it's dirty if any field has been touched/filled
    if (isNew) {
      return title.trim() !== '' || content.trim() !== '' || tags.length > 0;
    }

    // For existing documents, check for any changes
    return (
      title !== initialData?.title ||
      content !== initialData?.content ||
      JSON.stringify(tags) !== JSON.stringify(initialData?.tags)
    );
  }, [isNew, title, content, tags, initialData]);

  useNavigationGuard(isDirty && !ignoreNavigationGuard);

  const resetNewDocumentDraft = useCallback(() => {
    setTitle('');
    setContent('');
    setTags([]);
    setTagInput('');
    setError(null);
    setEditorResetKey((prev) => prev + 1);
  }, []);

  // Reset form when entering new document mode
  useEffect(() => {
    if (isNew) {
      (async () => resetNewDocumentDraft())();
    }
  }, [isNew, resetNewDocumentDraft]);

  const [fetchedRole, setFetchedRole] = useState<string | null>(null);
  const userRole = fetchedRole || initialUserRole;

  // Fetch role if it's a new document or if the initial role is VIEWER (to verify)
  useEffect(() => {
    if (isNew || initialUserRole === 'VIEWER') {
      const fetchRole = async () => {
        try {
          const res = await fetch(`/api/libraries/${libraryId}`);
          if (res.ok) {
            const data = await res.json();
            setFetchedRole(data.role || 'VIEWER');
          }
        } catch (error) {
          console.error('Failed to fetch role:', error);
        }
      };
      fetchRole();
    }
  }, [libraryId, isNew, initialUserRole]);

  // Re-enable the navigation guard when switching document contexts
  useEffect(() => {
    (async () => setIgnoreNavigationGuard(false))();
  }, [isNew, initialData?.id]);

  // Handle reset request from sidebar button when already on new document page
  useEffect(() => {
    if (!isNew) return;

    const handleResetRequest = () => {
      if (!isDirty) {
        resetNewDocumentDraft();
        return;
      }

      const confirmed = window.confirm(
        'You have unsaved changes. Do you want to discard them and start a new document?'
      );

      if (confirmed) {
        resetNewDocumentDraft();
      }
    };

    window.addEventListener(
      'sylo:new-document:reset-request',
      handleResetRequest
    );
    return () => {
      window.removeEventListener(
        'sylo:new-document:reset-request',
        handleResetRequest
      );
    };
  }, [isNew, isDirty, resetNewDocumentDraft]);

  const now = new Date().toISOString();
  const createdAt = initialData?.created_at || now;
  const updatedAt = initialData?.updated_at || now;

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim() !== '') {
      e.preventDefault();
      const newTag = tagInput.trim().toUpperCase();
      if (!tags.includes(newTag)) {
        setTags([...tags, newTag]);
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const url = isNew
        ? `/api/documents`
        : `/api/documents/${initialData!.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const payload: {
        title: string;
        content: string;
        tags: string[];
        libraryId?: string;
        lastUpdatedAt?: string;
      } = {
        title,
        content: content || '',
        tags,
      };

      if (isNew) {
        payload.libraryId = libraryId;
      } else {
        // Use the ref so repeated saves always send the latest timestamp,
        // not the stale initialData prop from the initial server render.
        payload.lastUpdatedAt = latestUpdatedAt.current;
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          throw new Error(
            data.error || 'Conflict: Document was edited by another user.'
          );
        }
        throw new Error(data.error || 'Failed to save document');
      }

      triggerRefresh();

      if (isNew) {
        setIgnoreNavigationGuard(true);
        router.push(`/hub/libraries/${libraryId}/documents/${data.documentId}`);
        router.refresh();
      } else {
        // Capture the new updated_at returned by the server so that the
        // next save sends the correct timestamp for the OCC check.
        if (data?.document?.updated_at) {
          latestUpdatedAt.current = data.document.updated_at;
        }
        setIsEditMode(false);
        router.refresh();
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'An unknown error occurred';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!initialData?.id) return;

    setIsDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/documents/${initialData.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete document');
      }

      setIgnoreNavigationGuard(true);
      triggerRefresh();
      router.push(`/hub/libraries/${libraryId}/documents`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'An unknown error occurred';
      setError(message);
      setIsDeleting(false);
    }
  };

  const handleEditorChange = useCallback(
    (markdown: string, blockCount: number) => {
      setContent(markdown);
      if (blockCount > 1000) {
        setError('Warning: Document exceeds 1000 blocks limit.');
      } else {
        setError(null);
      }
    },
    []
  );

  return (
    <div className="animate-fadeIn bg-background flex h-full flex-col overflow-hidden">
      {/* Top Fixed Header with Controls */}
      <div className="bg-background/95 border-border supports-[backdrop-filter]:bg-background/60 z-20 flex shrink-0 items-center justify-between border-b px-8 py-4 shadow-sm backdrop-blur">
        <div className="mr-4 flex-1">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={60}
            placeholder="Untitled Document"
            aria-label="Document Title"
            title={title} // Hover to show full title
            disabled={!isEditMode}
            className="text-foreground placeholder:text-muted-foreground/30 w-full truncate border-none bg-transparent text-3xl font-bold focus:outline-none disabled:bg-transparent disabled:opacity-100"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Draft indicator removed */}

          {!isNew && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditMode(!isEditMode)}
              className="text-muted-foreground"
            >
              {isEditMode ? (
                <>
                  <Eye className="mr-2 h-4 w-4" /> View Mode
                </>
              ) : (
                <>
                  <Edit className="mr-2 h-4 w-4" /> Edit Mode
                </>
              )}
            </Button>
          )}

          {isEditMode && (
            <Button
              type="button"
              size="sm"
              onClick={() => handleSubmit()}
              disabled={
                isLoading ||
                !title.trim() ||
                !!error?.includes('exceeds 1000 blocks')
              }
              className="rounded-lg bg-[#10b981] px-4 font-semibold text-white shadow-sm hover:bg-[#059669]"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save
            </Button>
          )}

          {!isNew && userRole !== 'VIEWER' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isDeleting}
                  className="text-destructive hover:bg-destructive/10 border-zinc-200 dark:border-zinc-800"
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="text-destructive h-5 w-5" />
                    Delete Document
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete <strong>{title}</strong>?
                    This action will soft-delete the document and it will no
                    longer be accessible in the library. This action cannot be
                    undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault();
                      handleDelete();
                    }}
                    disabled={isDeleting}
                    variant="destructive"
                  >
                    {isDeleting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      'Delete Document'
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Metadata & Tags Header Bar */}
      <div className="border-border flex shrink-0 flex-col gap-4 border-b bg-zinc-50/50 px-8 py-4 dark:bg-zinc-900/20">
        {/* Metadata Row */}
        <div className="text-muted-foreground/60 flex flex-wrap items-center gap-x-8 gap-y-2 text-[11px] font-bold tracking-wider uppercase">
          <div className="flex items-center">
            <Calendar className="mr-2 h-3.5 w-3.5" />
            CREATED:{' '}
            <span className="text-muted-foreground/90 ml-1">
              {new Date(createdAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>
          {createdAt !== updatedAt && (
            <div className="flex items-center">
              <Clock className="mr-2 h-3.5 w-3.5" />
              MODIFIED:{' '}
              <span className="text-muted-foreground/90 ml-1">
                {new Date(updatedAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
          )}
          {!isNew && initialData?.authors && initialData.authors.length > 0 && (
            <div className="flex items-center">
              <Users className="mr-2 h-3.5 w-3.5" />
              AUTHORS:{' '}
              <span className="text-muted-foreground/90 ml-1">
                {initialData.authors.map((a) => a.name).join(', ')}
              </span>
            </div>
          )}
        </div>

        {/* Tags Row */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-muted-foreground hover:text-foreground group flex items-center gap-1 rounded-full border-none bg-zinc-100 px-3 py-0.5 text-[10px] transition-colors dark:bg-zinc-800"
              >
                {tag}
                {isEditMode && (
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-1 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                )}
              </Badge>
            ))}
          </div>
          {isEditMode && (
            <div className="max-w-[200px] min-w-[120px] flex-1">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="Add tag..."
                aria-label="Tags"
                className="text-muted-foreground/60 placeholder:text-muted-foreground/30 w-full border-none bg-transparent text-xs focus:outline-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* Dedicated Scrollable Editor Area */}
      <div className="relative flex-1 overflow-hidden">
        {error && (
          <div
            role="alert"
            className="bg-destructive text-destructive-foreground absolute top-3 left-1/2 z-30 flex w-[92%] max-w-xl -translate-x-1/2 items-start gap-3 rounded-lg px-4 py-3 text-sm font-medium shadow-lg"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="flex-1">{error}</span>
            <button
              type="button"
              aria-label="Dismiss error"
              onClick={() => setError(null)}
              className="transition-opacity hover:opacity-70"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="h-full px-8 py-6">
          <div className="mx-auto h-full max-w-4xl">
            <Editor
              key={editorResetKey}
              initialContent={content}
              onChange={handleEditorChange}
              editable={isEditMode}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
