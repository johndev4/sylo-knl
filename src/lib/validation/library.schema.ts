import { z } from 'zod';

// User roles enum
export const UserRoleEnum = z.enum(['OWNER', 'ADMIN', 'EDITOR', 'VIEWER']);
export type UserRole = z.infer<typeof UserRoleEnum>;

// Add member to library
export const AddLibraryMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: UserRoleEnum.refine((role) => role !== 'OWNER', {
    message: 'Cannot assign OWNER role when adding members. Only library creator can be OWNER.',
  }),
});
export type AddLibraryMemberInput = z.infer<typeof AddLibraryMemberSchema>;

// Update member role
export const UpdateLibraryMemberRoleSchema = z.object({
  role: UserRoleEnum.refine((role) => role !== 'OWNER', {
    message: 'Cannot change role to OWNER. Only one owner per library allowed.',
  }),
});
export type UpdateLibraryMemberRoleInput = z.infer<
  typeof UpdateLibraryMemberRoleSchema
>;

// Delete member
export const DeleteLibraryMemberSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
});
export type DeleteLibraryMemberInput = z.infer<
  typeof DeleteLibraryMemberSchema
>;

// Library member (from database)
export const LibraryMemberSchema = z.object({
  library_id: z.string().uuid(),
  user_id: z.string().uuid(),
  role: UserRoleEnum,
  created_at: z.string().datetime().or(z.date()),
  user: z.object({
    id: z.string().uuid(),
    name: z.string().nullable(),
    email: z.string().email(),
    avatar_url: z.string().nullable(),
  }).optional(),
});
export type LibraryMember = z.infer<typeof LibraryMemberSchema>;

// List library members response
export const ListLibraryMembersSchema = z.array(LibraryMemberSchema);
export type ListLibraryMembers = z.infer<typeof ListLibraryMembersSchema>;
