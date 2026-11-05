'use client';

import { useState, useCallback } from 'react';
import type { BlockNoteEditor } from '@blocknote/core';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  ChevronDown,
  FileText,
  FileCode2,
  Braces,
  Loader2,
} from 'lucide-react';
import { appToast } from '@/lib/toast';
import {
  exportDocumentAsJson,
  exportDocumentAsMarkdown,
  exportDocumentAsPdf,
  type DocumentExportMetadata,
} from '../utils/export-document';

interface DocumentExportMenuProps {
  metadata: DocumentExportMetadata;
  editor: BlockNoteEditor | null;
  variant?: 'desktop' | 'mobile';
}

type ExportFormat = 'pdf' | 'markdown' | 'json';

export function DocumentExportMenu({
  metadata,
  editor,
  variant = 'desktop',
}: DocumentExportMenuProps) {
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(
    null
  );

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      if (!editor) {
        appToast.error(
          'Document editor is not ready. Please wait a moment and try again.'
        );
        return;
      }

      setExportingFormat(format);

      try {
        if (format === 'markdown') {
          exportDocumentAsMarkdown(metadata, editor);
          appToast.success(
            'Markdown exported',
            `Saved as ${metadata.title || 'document'}.md`
          );
        } else if (format === 'json') {
          exportDocumentAsJson(metadata, editor);
          appToast.success(
            'JSON data exported',
            `Saved as ${metadata.title || 'document'}.json`
          );
        } else if (format === 'pdf') {
          appToast.info('Preparing PDF document…');
          await exportDocumentAsPdf(metadata, editor);
          appToast.success(
            'PDF exported',
            `Saved as ${metadata.title || 'document'}.pdf`
          );
        }
      } catch (err: unknown) {
        const errorMsg =
          err instanceof Error
            ? err.message
            : 'An unexpected error occurred during export.';
        appToast.error('Export failed', errorMsg);
      } finally {
        setExportingFormat(null);
      }
    },
    [editor, metadata]
  );

  const isExporting = exportingFormat !== null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          variant === 'mobile' ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isExporting || !editor}
              aria-busy={isExporting}
              className="text-muted-foreground hover:text-foreground h-11 w-11 touch-manipulation p-0"
              aria-label={
                isExporting ? 'Exporting document…' : 'Export document'
              }
              title="Export document"
            >
              {isExporting ? (
                <>
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                  <span className="sr-only">Exporting…</span>
                </>
              ) : (
                <Download className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isExporting || !editor}
              aria-busy={isExporting}
              className="text-muted-foreground hover:text-foreground touch-manipulation"
              aria-label={
                isExporting ? 'Exporting document…' : 'Export document'
              }
            >
              {isExporting ? (
                <Loader2
                  className="mr-2 h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <Download className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              <span>{isExporting ? 'Exporting…' : 'Export'}</span>
              <ChevronDown
                className="ml-1 h-3.5 w-3.5 opacity-60"
                aria-hidden="true"
              />
            </Button>
          )
        }
      />

      <DropdownMenuContent
        align={variant === 'mobile' ? 'end' : 'end'}
        side="bottom"
        sideOffset={6}
        className="w-64 max-w-[calc(100vw-2rem)] p-1.5"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-muted-foreground px-2 py-1 text-[11px] font-semibold tracking-wider uppercase">
            Export Document
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* PDF Option */}
          <DropdownMenuItem
            onClick={() => handleExport('pdf')}
            disabled={isExporting}
            className="flex min-h-[44px] cursor-pointer touch-manipulation items-center justify-between gap-3 px-2 py-2.5 sm:min-h-0 sm:py-1.5"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400">
                {exportingFormat === 'pdf' ? (
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <FileText className="h-4 w-4" aria-hidden="true" />
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium">PDF Document</span>
                <span className="text-muted-foreground text-[10px]">
                  Clean formatted document
                </span>
              </div>
            </div>
            <Badge
              variant="outline"
              className="text-muted-foreground font-mono text-[10px] uppercase"
            >
              .pdf
            </Badge>
          </DropdownMenuItem>

          {/* Markdown Option */}
          <DropdownMenuItem
            onClick={() => handleExport('markdown')}
            disabled={isExporting}
            className="flex min-h-[44px] cursor-pointer touch-manipulation items-center justify-between gap-3 px-2 py-2.5 sm:min-h-0 sm:py-1.5"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                {exportingFormat === 'markdown' ? (
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <FileCode2 className="h-4 w-4" aria-hidden="true" />
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium">Markdown</span>
                <span className="text-muted-foreground text-[10px]">
                  With YAML metadata
                </span>
              </div>
            </div>
            <Badge
              variant="outline"
              className="text-muted-foreground font-mono text-[10px] uppercase"
            >
              .md
            </Badge>
          </DropdownMenuItem>

          {/* JSON Option */}
          <DropdownMenuItem
            onClick={() => handleExport('json')}
            disabled={isExporting}
            className="flex min-h-[44px] cursor-pointer touch-manipulation items-center justify-between gap-3 px-2 py-2.5 sm:min-h-0 sm:py-1.5"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                {exportingFormat === 'json' ? (
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <Braces className="h-4 w-4" aria-hidden="true" />
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium">BlockNote JSON</span>
                <span className="text-muted-foreground text-[10px]">
                  Lossless blocks & data
                </span>
              </div>
            </div>
            <Badge
              variant="outline"
              className="text-muted-foreground font-mono text-[10px] uppercase"
            >
              .json
            </Badge>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
