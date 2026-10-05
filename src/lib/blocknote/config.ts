import type { Block, PartialBlock } from '@blocknote/core';
import { z } from 'zod';

// -----------------------------------------------------------------------------
// Schemas
// -----------------------------------------------------------------------------

export const BlockNotePartialBlockSchema = z.custom<PartialBlock>();
export const BlockNotePartialBlocksSchema = z.custom<PartialBlock[]>((val) =>
  Array.isArray(val)
);
export const BlockNoteBlocksSchema = z.custom<Block[]>((val) =>
  Array.isArray(val)
);

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type BlockNotePartialBlocks = z.infer<
  typeof BlockNotePartialBlocksSchema
>;
export type BlockNoteBlocks = z.infer<typeof BlockNoteBlocksSchema>;
