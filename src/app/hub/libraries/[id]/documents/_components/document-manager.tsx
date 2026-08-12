'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { useTagSuggestions } from '@/lib/hooks/use-tag-suggestions';
import {
  Calendar,
  Clock,
  Users,
  X,
  AlertTriangle,
  ChevronUp,
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
} from '@/components/ui/alert-dialog';
import { DocumentActions } from './document-actions';
import { useSidebarRefresh } from './sidebar-refresh-context';
import { TagChipsInput } from './tag-chips-input';
import { useNavigationGuard } from '@/lib/hooks/use-navigation-guard';
import { BlockEditor } from './block_editor';

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

/**
 * Describes a deferred action that requires the user to confirm discarding
 * unsaved changes before it is executed.
 *
 * - 'cancel'   → exit edit mode and reset to saved data
 * - 'navigate' → navigate to a different page/document
 * - 'reset'    → discard the new-document draft (triggered from sidebar "+")
 */
type PendingAction =
  { type: 'cancel' } | { type: 'navigate'; href: string } | { type: 'reset' };

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
  const { suggestions: tagSuggestions } = useTagSuggestions(
    libraryId,
    tagInput,
    tags
  );
  const [editorResetKey, setEditorResetKey] = useState(0);

  // Track the most recently saved updated_at so the OCC check
  // always sends the current server timestamp (not the stale prop).
  const latestUpdatedAt = useRef<string>(initialData?.updated_at || '');

  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ignoreNavigationGuard, setIgnoreNavigationGuard] = useState(false);
  const [isMetaOpen, setIsMetaOpen] = useState(true);

  /**
   * When non-null, the "Unsaved Changes" AlertDialog is shown.
   * On confirm, the pending action is executed.
   */
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null
  );

  // ---------------------------------------------------------------------------
  // Dirty tracking
  // ---------------------------------------------------------------------------

  const isDirty = useMemo(() => {
    // For new documents: any character (including whitespace / newlines) is a change
    if (isNew) {
      return title !== '' || content !== '' || tags.length > 0;
    }

    // For existing documents: raw comparison so whitespace/newline changes count
    return (
      title !== (initialData?.title ?? '') ||
      content !== (initialData?.content ?? '') ||
      JSON.stringify(tags) !==
        JSON.stringify((initialData?.tags ?? []).map((t) => t.toUpperCase()))
    );
  }, [isNew, title, content, tags, initialData]);

  // ---------------------------------------------------------------------------
  // Navigation guard — shows AlertDialog instead of window.confirm
  // ---------------------------------------------------------------------------

  const handleNavigationAttempt = useCallback((href: string) => {
    setPendingAction({ type: 'navigate', href });
  }, []);

  useNavigationGuard(
    isDirty && !ignoreNavigationGuard,
    handleNavigationAttempt
  );

  // ---------------------------------------------------------------------------
  // Reset helpers
  // ---------------------------------------------------------------------------

  const resetNewDocumentDraft = useCallback(() => {
    setTitle('');
    setContent('');
    setTags([]);
    setTagInput('');
    setError(null);
    setEditorResetKey((prev) => prev + 1);
  }, []);

  const resetToInitialData = useCallback(() => {
    setTitle(initialData?.title ?? '');
    setContent(initialData?.content ?? '');
    setTags((initialData?.tags ?? []).map((t) => t.toUpperCase()));
    setTagInput('');
    setError(null);
    setEditorResetKey((prev) => prev + 1);
    setIsEditMode(false);
  }, [initialData]);

  // ---------------------------------------------------------------------------
  // Confirm / dismiss the unified unsaved-changes dialog
  // ---------------------------------------------------------------------------

  const handleConfirmDiscard = useCallback(() => {
    if (!pendingAction) return;

    switch (pendingAction.type) {
      case 'cancel':
        resetToInitialData();
        break;
      case 'navigate':
        // Navigation guard won't re-fire for programmatic push, so no need
        // to set ignoreNavigationGuard here.
        router.push(pendingAction.href);
        break;
      case 'reset':
        resetNewDocumentDraft();
        break;
    }

    setPendingAction(null);
  }, [pendingAction, resetToInitialData, resetNewDocumentDraft, router]);

  const handleDismissDiscard = useCallback(() => {
    setPendingAction(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Cancel button handler
  // ---------------------------------------------------------------------------

  const handleCancel = useCallback(() => {
    if (isDirty) {
      setPendingAction({ type: 'cancel' });
    } else {
      resetToInitialData();
    }
  }, [isDirty, resetToInitialData]);

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

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

  // Ensure VIEWER members cannot enter edit mode
  useEffect(() => {
    if (userRole === 'VIEWER' && !isNew) {
      (async () => setIsEditMode(false))();
    }
  }, [userRole, isNew]);

  // Re-enable the navigation guard when switching document contexts
  useEffect(() => {
    (async () => setIgnoreNavigationGuard(false))();
  }, [isNew, initialData?.id]);

  // Broadcast title changes so sibling components (e.g. breadcrumb nav) can
  // update reactively without shared context or prop drilling.
  useEffect(() => {
    const documentId = isNew ? 'new' : (initialData?.id ?? 'new');
    window.dispatchEvent(
      new CustomEvent('sylo:document:title-change', {
        detail: { documentId, title },
      })
    );
  }, [title, isNew, initialData?.id]);

  // Handle reset request from sidebar "+" button when already on new document page.
  // Uses the unified AlertDialog instead of window.confirm.
  useEffect(() => {
    if (!isNew) return;

    const handleResetRequest = () => {
      if (!isDirty) {
        resetNewDocumentDraft();
        return;
      }
      // Show the unified dialog
      setPendingAction({ type: 'reset' });
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

  // ---------------------------------------------------------------------------
  // Computed dialog copy (changes based on the pending action type)
  // ---------------------------------------------------------------------------

  const discardDialogCopy = useMemo(() => {
    switch (pendingAction?.type) {
      case 'navigate':
        return {
          title: 'Leave without saving?',
          description:
            'You have unsaved changes. Navigating away will discard all changes. This action cannot be undone.',
          confirm: 'Leave & Discard',
        };
      case 'reset':
        return {
          title: 'Start a new document?',
          description:
            'You have unsaved changes. Starting a new document will discard all current changes. This action cannot be undone.',
          confirm: 'Discard & Start New',
        };
      case 'cancel':
      default:
        return {
          title: 'Discard Changes?',
          description:
            'You have unsaved changes. Cancelling will discard all changes and return to view mode. This action cannot be undone.',
          confirm: 'Discard Changes',
        };
    }
  }, [pendingAction]);

  // ---------------------------------------------------------------------------
  // Data
  // ---------------------------------------------------------------------------

  const now = new Date().toISOString();
  const createdAt = initialData?.created_at || now;
  const updatedAt = initialData?.updated_at || now;

  // ---------------------------------------------------------------------------
  // Tag handlers
  // ---------------------------------------------------------------------------

  const addTag = (tagValue: string) => {
    const newTag = tagValue.trim().toUpperCase();
    if (!newTag || tags.includes(newTag)) {
      return;
    }
    setTags([...tags, newTag]);
    setTagInput('');
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  // ---------------------------------------------------------------------------
  // Save
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Editor change
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="animate-fadeIn bg-background flex h-full flex-col overflow-hidden">
      {/* ── Unified "Unsaved Changes" AlertDialog ───────────────────────────── */}
      <AlertDialog
        open={pendingAction !== null}
        onOpenChange={(open) => {
          if (!open) handleDismissDiscard();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {discardDialogCopy.title}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {discardDialogCopy.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDismissDiscard}>
              Keep Editing
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmDiscard();
              }}
              variant="destructive"
            >
              {discardDialogCopy.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Top Fixed Header with Controls ──────────────────────────────────── */}
      <div className="bg-background/95 border-border supports-[backdrop-filter]:bg-background/60 z-20 flex shrink-0 items-center justify-between border-b py-1 pr-3 pl-1 shadow-sm backdrop-blur">
        <div
          className={`mr-4 flex-1 px-3 py-1 ${isEditMode ? 'rounded-lg border bg-transparent focus-within:ring-1 focus-within:ring-zinc-400 dark:focus-within:ring-zinc-600' : ''}`}
        >
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={60}
            placeholder="Untitled Document"
            aria-label="Document Title"
            title={title} // Hover to show full title
            disabled={!isEditMode || userRole === 'VIEWER'}
            className="text-foreground placeholder:text-muted-foreground/30 w-full truncate border-none bg-transparent text-3xl font-bold focus:outline-none disabled:bg-transparent disabled:opacity-100"
          />
        </div>

        <DocumentActions
          isNew={isNew}
          isEditMode={isEditMode}
          userRole={userRole}
          title={title}
          isLoading={isLoading}
          isDeleting={isDeleting}
          hasBlockLimitError={!!error?.includes('exceeds 1000 blocks')}
          onEnterEditMode={() => setIsEditMode(true)}
          onCancel={handleCancel}
          onSave={handleSubmit}
          onDelete={handleDelete}
        />
      </div>

      {/* ── Metadata & Tags Header Bar ──────────────────────────────────────── */}
      <div className="border-border relative shrink-0 border-b bg-zinc-50/50 dark:bg-zinc-900/20">
        {!isMetaOpen && <div className="h-7" />}
        <button
          onClick={() => setIsMetaOpen((v) => !v)}
          className="hover:text-muted-foreground absolute right-1 bottom-0 rounded-full p-1 transition-colors"
          aria-expanded={isMetaOpen}
          aria-label="Toggle details"
        >
          <ChevronUp
            className={`h-4.5 w-4.5 transition-transform duration-200 ${isMetaOpen ? '' : 'rotate-180'}`}
          />
        </button>

        {isMetaOpen && (
          <div className="flex flex-col gap-4 px-8 py-4 pr-8">
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
              {!isNew &&
                initialData?.authors &&
                initialData.authors.length > 0 && (
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
              {isEditMode ? (
                <TagChipsInput
                  tags={tags}
                  tagInput={tagInput}
                  suggestions={tagSuggestions}
                  onInputChange={setTagInput}
                  onAddTag={addTag}
                  onRemoveTag={removeTag}
                />
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="text-muted-foreground rounded-full border-none bg-zinc-100 px-3 py-0.5 text-[10px] dark:bg-zinc-800"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Dedicated Scrollable Editor Area ────────────────────────────────── */}
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
        <div className="h-full">
          <div className="mx-auto h-full max-w-5xl">
            <BlockEditor
              key={editorResetKey}
              initialContent={content}
              onChange={handleEditorChange}
              editable={isEditMode && userRole !== 'VIEWER'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
