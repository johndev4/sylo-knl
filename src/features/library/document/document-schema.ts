import { BlockNotePartialBlockSchema } from '@/lib/blocknote/config';
import { z } from 'zod';

// -----------------------------------------------------------------------------
// Schemas
// -----------------------------------------------------------------------------

export const CreateDocumentInputSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  contentJson: z
    .array(BlockNotePartialBlockSchema)
    .min(1, 'Content is required')
    .max(1000, 'Document cannot exceed 1,000 blocks'),
  libraryId: z.string().uuid('Invalid Library ID'),
  tags: z.array(z.string()).optional(),
});

export const UpdateDocumentInputSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  contentJson: z
    .array(BlockNotePartialBlockSchema)
    .min(1, 'Content is required')
    .max(1000, 'Document cannot exceed 1,000 blocks'),
  tags: z.array(z.string()).optional(),
  lastUpdatedAt: z.string().optional(),
  contentModified: z.boolean().optional(),
});

export const DocumentListItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  tags: z.array(z.string()),
  created_at: z.string(),
});

export const DocumentListResultSchema = z.object({
  data: z.array(DocumentListItemSchema),
  metadata: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
  }),
});

export const DocumentAuthorSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatar_url: z.string().nullable(),
});

export const DocumentDetailSchema = z.object({
  id: z.string(),
  title: z.string(),
  content_json: z.array(BlockNotePartialBlockSchema),
  tags: z.array(z.string()),
  author_ids: z.array(z.string()),
  library_id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable(),
  authors: z.array(DocumentAuthorSchema),
});

export const DocumentResultSchema = z.object({
  document: DocumentDetailSchema,
});

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type CreateDocumentInput = z.infer<typeof CreateDocumentInputSchema>;
export type UpdateDocumentInput = z.infer<typeof UpdateDocumentInputSchema>;
export type DocumentListItem = z.infer<typeof DocumentListItemSchema>;
export type DocumentListResult = z.infer<typeof DocumentListResultSchema>;
export type DocumentAuthor = z.infer<typeof DocumentAuthorSchema>;
export type DocumentDetail = z.infer<typeof DocumentDetailSchema>;
export type DocumentResult = z.infer<typeof DocumentResultSchema> | null;
