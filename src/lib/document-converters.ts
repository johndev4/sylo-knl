'use server';

import { ServerBlockNoteEditor } from '@blocknote/server-util';

export interface BlockNoteBlockJson {
  id?: string;
  type: string;
  props?: Record<string, unknown>;
  content?: unknown;
  children?: BlockNoteBlockJson[];
}

const MAX_BLOCK_COUNT = 1000;
const MAX_BLOCK_DEPTH = 100;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateBlocks(value: unknown): asserts value is BlockNoteBlockJson[] {
  if (!Array.isArray(value)) {
    throw new TypeError(
      'Document content must be an array of BlockNote blocks'
    );
  }

  let blockCount = 0;
  const pending = value.map((block) => ({ block, depth: 1 }));

  while (pending.length > 0) {
    const next = pending.pop();
    if (!next || !isRecord(next.block) || typeof next.block.type !== 'string') {
      throw new TypeError('Document contains an invalid BlockNote block');
    }

    blockCount += 1;
    if (blockCount > MAX_BLOCK_COUNT) {
      throw new RangeError(`Documents cannot exceed ${MAX_BLOCK_COUNT} blocks`);
    }
    if (next.depth > MAX_BLOCK_DEPTH) {
      throw new RangeError(
        `Document blocks cannot be nested deeper than ${MAX_BLOCK_DEPTH} levels`
      );
    }
    if (next.block.props !== undefined && !isRecord(next.block.props)) {
      throw new TypeError('Block props must be an object');
    }
    if (
      next.block.children !== undefined &&
      !Array.isArray(next.block.children)
    ) {
      throw new TypeError('Block children must be an array');
    }

    for (const child of next.block.children ?? []) {
      pending.push({ block: child, depth: next.depth + 1 });
    }
  }
}

export async function parseBlockNoteJson(
  value: unknown
): Promise<BlockNoteBlockJson[]> {
  validateBlocks(value);
  return value;
}

function getText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(getText).join('');
  if (!isRecord(value)) return '';

  if (typeof value.text === 'string') return value.text;
  if (Array.isArray(value.rows)) return value.rows.map(getText).join('\n');
  if (Array.isArray(value.cells)) return value.cells.map(getText).join(' ');
  if (value.content !== undefined) return getText(value.content);
  return '';
}

function extractBlockText(block: BlockNoteBlockJson): string {
  const props = isRecord(block.props) ? block.props : {};
  const content = getText(block.content);
  const name = typeof props.name === 'string' ? props.name : '';
  const caption = typeof props.caption === 'string' ? props.caption : '';
  const children = (block.children ?? []).map(extractBlockText).filter(Boolean);
  return [content, name, caption, ...children].filter(Boolean).join('\n');
}

function extractPlainText(blocks: BlockNoteBlockJson[]): string {
  return blocks.map(extractBlockText).filter(Boolean).join('\n').trim();
}

/** This function ensures that image-related text (alt text and captions) from markdown is preserved in the plain text output.
 * It parses the markdown as HTML, extracts alt text and figcaption content from all <img> elements,
 * and appends any image text that's missing from the existing plainText to avoid losing information during conversion.*/
async function preserveImageText(
  markdown: string,
  plainText: string
): Promise<string> {
  const { parseHTML } = await import('linkedom');
  const { document } = parseHTML(markdown);

  const imageText = Array.from(document.querySelectorAll('img'))
    .map((image) => {
      const alt = image.getAttribute('alt') ?? '';
      const caption =
        image.closest('figure')?.querySelector('figcaption')?.textContent ?? '';
      return [alt, caption.trim()].filter(Boolean).join('\n');
    })
    .filter(Boolean);

  const missingText = imageText.filter((text) => !plainText.includes(text));
  return [plainText, ...missingText].filter(Boolean).join('\n').trim();
}

/** Converts Markdown to plain text using a BlockNote editor instance, preserving image alt text and captions. */
async function markdownToPlainTextWithEditor(
  markdown: string,
  editor: ServerBlockNoteEditor
): Promise<string> {
  if (!markdown.trim()) return '';
  const blocks = await editor.tryParseMarkdownToBlocks(markdown);
  validateBlocks(blocks);
  return preserveImageText(markdown, extractPlainText(blocks));
}

/** Parses a legacy Markdown document into BlockNote blocks. */
export async function markdownToBlockNoteJson(
  markdown: string
): Promise<BlockNoteBlockJson[]> {
  if (!markdown.trim()) return [];
  const editor = ServerBlockNoteEditor.create();
  const blocks = await editor.tryParseMarkdownToBlocks(markdown);
  validateBlocks(blocks);
  return blocks;
}

/** Converts canonical BlockNote JSON through transient Markdown to plain text. */
export async function blockNoteJsonToMarkdownAndPlainText(
  value: unknown
): Promise<{ markdown: string; plainText: string }> {
  validateBlocks(value);
  if (value.length === 0) return { markdown: '', plainText: '' };
  const editor = ServerBlockNoteEditor.create();
  const markdown = await editor.blocksToMarkdownLossy(value as never);
  return {
    markdown,
    plainText: await markdownToPlainTextWithEditor(markdown, editor),
  };
}
