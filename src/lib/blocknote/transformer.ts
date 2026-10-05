'use server';

import { ServerBlockNoteEditor } from '@blocknote/server-util';
import type { BlockNoteBlocks, BlockNotePartialBlocks } from './config';

const editor = ServerBlockNoteEditor.create();

export async function serverConvertBlocksToMarkdown(
  blocks: BlockNotePartialBlocks
): Promise<string> {
  return editor.blocksToMarkdownLossy(blocks);
}

export async function serverConvertBlocksToHTML(
  blocks: BlockNotePartialBlocks
): Promise<string> {
  return editor.blocksToFullHTML(blocks);
}

export async function serverConvertMarkdownToBlocks(
  markdown: string
): Promise<BlockNoteBlocks> {
  return await editor.tryParseMarkdownToBlocks(markdown);
}
