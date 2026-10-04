'use server';

import { ServerBlockNoteEditor } from '@blocknote/server-util';
import type { BlockNoteBlockJson } from '@/lib/document-converters';

export async function serverConvertBlocksToMarkdown(
  blocks: BlockNoteBlockJson[]
): Promise<string> {
  const editor = ServerBlockNoteEditor.create();
  return editor.blocksToMarkdownLossy(blocks as never);
}

export async function serverConvertBlocksToHTML(
  blocks: BlockNoteBlockJson[]
): Promise<string> {
  const editor = ServerBlockNoteEditor.create();
  return editor.blocksToFullHTML(blocks as never);
}

export async function serverConvertMarkdownToBlocks(
  markdown: string
): Promise<BlockNoteBlockJson[]> {
  const editor = ServerBlockNoteEditor.create();
  return (await editor.tryParseMarkdownToBlocks(
    markdown
  )) as BlockNoteBlockJson[];
}
