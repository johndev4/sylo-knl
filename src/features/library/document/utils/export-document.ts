import type { BlockNoteEditor } from '@blocknote/core';

export interface DocumentExportMetadata {
  id?: string;
  title: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  authors?: { id: string; name: string }[];
}

/**
 * Normalizes document title into a clean kebab-case filename.
 * Falls back to "document" if title is empty or contains only non-word characters.
 */
export function sanitizeFilename(title: string, extension: string): string {
  const cleanTitle = (title || 'untitled')
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  const ext = extension.startsWith('.') ? extension.slice(1) : extension;
  return `${cleanTitle || 'document'}.${ext}`;
}

/**
 * Triggers a client-side file download for a given Blob.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = window.document.createElement('a');
  a.href = url;
  a.download = filename;
  window.document.body.appendChild(a);
  a.click();
  window.document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/**
 * Triggers a client-side file download for text content.
 */
export function downloadText(
  text: string,
  filename: string,
  mimeType: string
): void {
  const blob = new Blob([text], { type: mimeType });
  downloadBlob(blob, filename);
}

/**
 * Exports document as structured JSON with metadata envelope and BlockNote blocks.
 */
export function exportDocumentAsJson(
  metadata: DocumentExportMetadata,
  editor: BlockNoteEditor
): void {
  const envelope = {
    id: metadata.id ?? null,
    title: metadata.title || 'Untitled Document',
    tags: metadata.tags ?? [],
    created_at: metadata.createdAt ?? null,
    updated_at: metadata.updatedAt ?? null,
    authors: metadata.authors ?? [],
    content: editor.document,
  };

  const jsonString = JSON.stringify(envelope, null, 2);
  const filename = sanitizeFilename(metadata.title, 'json');
  downloadText(jsonString, filename, 'application/json;charset=utf-8');
}

/**
 * Exports document as Markdown with YAML frontmatter containing metadata.
 */
export function exportDocumentAsMarkdown(
  metadata: DocumentExportMetadata,
  editor: BlockNoteEditor
): void {
  const markdownBody = editor.blocksToMarkdownLossy(editor.document);
  const frontmatter = [
    '---',
    `title: ${JSON.stringify(metadata.title || 'Untitled Document')}`,
    metadata.tags && metadata.tags.length > 0
      ? `tags: [${metadata.tags.map((t) => JSON.stringify(t)).join(', ')}]`
      : null,
    metadata.createdAt
      ? `created_at: ${JSON.stringify(metadata.createdAt)}`
      : null,
    metadata.updatedAt
      ? `updated_at: ${JSON.stringify(metadata.updatedAt)}`
      : null,
    metadata.authors && metadata.authors.length > 0
      ? `authors: [${metadata.authors.map((a) => JSON.stringify(a.name)).join(', ')}]`
      : null,
    '---',
    '',
    `# ${metadata.title || 'Untitled Document'}`,
    '',
    markdownBody,
  ]
    .filter((line) => line !== null)
    .join('\n');

  const filename = sanitizeFilename(metadata.title, 'md');
  downloadText(frontmatter, filename, 'text/markdown;charset=utf-8');
}

/**
 * Exports document as PDF using @blocknote/xl-pdf-exporter (Typst WebAssembly).
 * Dynamically loaded so the WebAssembly compiler is only downloaded on-demand.
 */
export async function exportDocumentAsPdf(
  metadata: DocumentExportMetadata,
  editor: BlockNoteEditor
): Promise<void> {
  const { PDFExporter, typstDefaultSchemaMappings } =
    await import('@blocknote/xl-pdf-exporter');

  const exporter = new PDFExporter(editor.schema, typstDefaultSchemaMappings);
  const authorNames =
    metadata.authors?.map((a) => a.name).join(', ') || undefined;

  const result = await exporter.toPDF(editor.document, {
    title: metadata.title || 'Untitled Document',
    author: authorNames,
    lang: 'en',
    tryDeclarePdfUA: false,
  });

  if (result.error) {
    const errorDetails =
      result.compileErrors?.map((e) => e.message).join(', ') ||
      'Failed to compile PDF document';
    throw new Error(errorDetails);
  }

  const filename = sanitizeFilename(metadata.title, 'pdf');
  downloadBlob(result.blob, filename);
}
