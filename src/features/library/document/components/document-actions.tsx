import { Button } from '@/components/ui/button';
import { Edit, X, Save, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import type { BlockNoteEditor } from '@blocknote/core';
import { DocumentExportMenu } from './document-export-menu';
import type { DocumentExportMetadata } from '../utils/export-document';
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

interface DocumentActionsProps {
  isNew: boolean;
  isEditMode: boolean;
  userRole: string;
  title: string;
  isLoading: boolean;
  isDeleting: boolean;
  hasBlockLimitError: boolean;
  canDelete?: boolean;
  exportMetadata?: DocumentExportMetadata;
  editor?: BlockNoteEditor | null;
  onEnterEditMode: () => void;
  onCancel: () => void;
  onSave: () => void;
  onDelete: () => void;
}

export function DocumentActions({
  isNew,
  isEditMode,
  userRole,
  title,
  isLoading,
  isDeleting,
  hasBlockLimitError,
  canDelete = true,
  exportMetadata,
  editor,
  onEnterEditMode,
  onCancel,
  onSave,
  onDelete,
}: DocumentActionsProps) {
  const isViewer = userRole === 'VIEWER';
  const saveDisabled = isLoading || !title.trim() || hasBlockLimitError;

  const deleteDialog = (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle className="flex items-center gap-2">
          <AlertTriangle className="text-destructive h-5 w-5" />
          Delete Document
        </AlertDialogTitle>
        <AlertDialogDescription>
          Are you sure you want to delete <strong>{title}</strong>? This action
          will soft-delete the document and it will no longer be accessible in
          the library. This action cannot be undone.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
        <AlertDialogAction
          onClick={(e) => {
            e.preventDefault();
            onDelete();
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
  );

  return (
    <div className="flex items-center gap-2">
      {/* Desktop (sm+) */}
      <div className="hidden items-center gap-2 sm:flex">
        {!isNew && !isEditMode && exportMetadata && editor && (
          <DocumentExportMenu
            metadata={exportMetadata}
            editor={editor}
            variant="desktop"
          />
        )}
        {!isNew && !isEditMode && !isViewer && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onEnterEditMode}
            className="text-muted-foreground"
          >
            <Edit className="mr-2 h-4 w-4" /> Edit Mode
          </Button>
        )}
        {!isNew && isEditMode && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="text-muted-foreground"
          >
            <X className="mr-2 h-4 w-4" /> Cancel
          </Button>
        )}
        {isEditMode && !isViewer && (
          <Button
            type="button"
            size="sm"
            onClick={onSave}
            disabled={saveDisabled}
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
        {!isNew && !isEditMode && !isViewer && canDelete && (
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isDeleting}
                  className="text-destructive hover:bg-destructive/10 border-neutral-200 dark:border-neutral-800"
                  aria-label="Delete document"
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              }
            ></AlertDialogTrigger>
            {deleteDialog}
          </AlertDialog>
        )}
      </div>

      {/* Mobile (below sm) */}
      <div className="flex items-center gap-2 sm:hidden">
        {!isNew && !isEditMode && exportMetadata && editor && (
          <DocumentExportMenu
            metadata={exportMetadata}
            editor={editor}
            variant="mobile"
          />
        )}
        {!isNew && !isEditMode && !isViewer && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onEnterEditMode}
            className="text-muted-foreground h-11 touch-manipulation"
            aria-label="Edit document"
            title="Edit document"
          >
            <Edit className="h-4 w-4" aria-hidden="true" />
            <span>Edit</span>
          </Button>
        )}
        {!isNew && isEditMode && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="text-muted-foreground h-11 touch-manipulation"
            aria-label="Cancel editing"
            title="Cancel editing"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            <span>Cancel</span>
          </Button>
        )}
        {isEditMode && !isViewer && (
          <Button
            type="button"
            size="sm"
            onClick={onSave}
            disabled={saveDisabled}
            className="h-11 touch-manipulation rounded-lg bg-[#10b981] px-4 font-semibold text-white shadow-sm hover:bg-[#059669]"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span>Saving…</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" aria-hidden="true" />
                <span>Save</span>
              </>
            )}
          </Button>
        )}
        {!isNew && !isEditMode && !isViewer && canDelete && (
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isDeleting}
                  className="text-destructive hover:bg-destructive/10 h-11 w-11 touch-manipulation sm:h-8 sm:w-auto"
                  aria-label="Delete document"
                  title="Delete document"
                >
                  {isDeleting ? (
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  )}
                </Button>
              }
            ></AlertDialogTrigger>
            {deleteDialog}
          </AlertDialog>
        )}
      </div>
    </div>
  );
}
