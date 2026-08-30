import { z } from 'zod';

// User roles enum
export const UserLibraryRoleEnum = z.enum([
  'OWNER',
  'ADMIN',
  'EDITOR',
  'VIEWER',
]);

// -----------------------------------------------------------------------------
// Schemas
// -----------------------------------------------------------------------------

export const LibraryIdSchema = z.uuid('Invalid library id');

export const TagSuggestionsQuerySchema = z.string();

export const UpdateLibraryMemberRoleInputSchema = z.object({
  role: UserLibraryRoleEnum.refine((role) => role !== 'OWNER', {
    message: 'Cannot change role to OWNER. Only one owner per library allowed.',
  }),
});

export const DeleteLibraryMemberInputSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
});

// Library member (from database)
export const LibraryMemberSchema = z.object({
  library_id: z.string().uuid(),
  user_id: z.string().uuid(),
  role: UserLibraryRoleEnum,
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
export const LibraryMemberListSchema = z.array(LibraryMemberSchema);

export const CreateInviteInputSchema = z.object({
  role: z.enum(['VIEWER', 'EDITOR']),
  expiresAt: z.string().datetime().optional().nullable(),
  maxUses: z.number().int().positive().optional().nullable(),
});

export const InviteSchema = z.object({
  id: z.string().uuid(),
  library_id: z.string().uuid(),
  invite_code: z.string(),
  role: UserLibraryRoleEnum,
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

export const UserLibraryListSchema = z.array(
  z.object({
    id: z.string().uuid(),
    name: z.string(),
    role: UserLibraryRoleEnum,
  })
);

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type UserLibraryRole = z.infer<typeof UserLibraryRoleEnum>;
export type UpdateLibraryMemberRoleInput = z.infer<
  typeof UpdateLibraryMemberRoleInputSchema
>;
export type DeleteLibraryMemberInput = z.infer<
  typeof DeleteLibraryMemberInputSchema
>;
export type LibraryMember = z.infer<typeof LibraryMemberSchema>;
export type LibraryMemberList = z.infer<typeof LibraryMemberListSchema>;
export type CreateInviteInput = z.infer<typeof CreateInviteInputSchema>;
export type Invite = z.infer<typeof InviteSchema>;
export type UserLibraryList = z.infer<typeof UserLibraryListSchema>;
