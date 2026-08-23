import { z } from 'zod';

// User roles enum
export const UserRoleEnum = z.enum(['OWNER', 'ADMIN', 'EDITOR', 'VIEWER']);

// -----------------------------------------------------------------------------
// Schemas
// -----------------------------------------------------------------------------

export const LibraryIdSchema = z.uuid('Invalid library id');

export const TagSuggestionsQuerySchema = z.string();

export const UpdateLibraryMemberRoleSchema = z.object({
  role: UserRoleEnum.refine((role) => role !== 'OWNER', {
    message: 'Cannot change role to OWNER. Only one owner per library allowed.',
  }),
});

export const DeleteLibraryMemberSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
});

// Library member (from database)
export const LibraryMemberSchema = z.object({
  library_id: z.string().uuid(),
  user_id: z.string().uuid(),
  role: UserRoleEnum,
  created_at: z.string().datetime({ offset: true }).or(z.date()),
  user: z
    .object({
      id: z.string().uuid(),
      name: z.string().nullable(),
      email: z.string().email(),
      avatar_url: z.string().nullable(),
    })
    .optional(),
});

// List library members response
export const ListLibraryMembersSchema = z.array(LibraryMemberSchema);

export const CreateInviteSchema = z.object({
  role: z.enum(['VIEWER', 'EDITOR']),
  expiresAt: z.string().datetime().optional().nullable(),
  maxUses: z.number().int().positive().optional().nullable(),
});

export const InviteResponseSchema = z.object({
  id: z.string().uuid(),
  library_id: z.string().uuid(),
  invite_code: z.string(),
  role: UserRoleEnum,
  created_by: z.string().uuid().nullable(),
  expires_at: z.string().datetime({ offset: true }).nullable(),
  max_uses: z.number().int().nullable(),
  use_count: z.number().int(),
  is_active: z.boolean(),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
  created_by_user: z
    .object({
      id: z.string().uuid(),
      name: z.string().nullable(),
      email: z.string().email(),
      avatar_url: z.string().nullable(),
    })
    .optional(),
});

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type UserRole = z.infer<typeof UserRoleEnum>;
export type UpdateLibraryMemberRoleInput = z.infer<
  typeof UpdateLibraryMemberRoleSchema
>;
export type DeleteLibraryMemberInput = z.infer<
  typeof DeleteLibraryMemberSchema
>;
export type LibraryMember = z.infer<typeof LibraryMemberSchema>;
export type ListLibraryMembers = z.infer<typeof ListLibraryMembersSchema>;
export type CreateInviteInput = z.infer<typeof CreateInviteSchema>;
export type InviteResponse = z.infer<typeof InviteResponseSchema>;
