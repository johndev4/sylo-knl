import { z } from 'zod';

// User roles enum
export const UserRoleEnum = z.enum(['OWNER', 'ADMIN', 'EDITOR', 'VIEWER']);
export type UserRole = z.infer<typeof UserRoleEnum>;

// Add member to workspace
export const AddWorkspaceMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: UserRoleEnum.refine((role) => role !== 'OWNER', {
    message: 'Cannot assign OWNER role when adding members. Only workspace creator can be OWNER.',
  }),
});
export type AddWorkspaceMemberInput = z.infer<typeof AddWorkspaceMemberSchema>;

// Update member role
export const UpdateWorkspaceMemberRoleSchema = z.object({
  role: UserRoleEnum.refine((role) => role !== 'OWNER', {
    message: 'Cannot change role to OWNER. Only one owner per workspace allowed.',
  }),
});
export type UpdateWorkspaceMemberRoleInput = z.infer<
  typeof UpdateWorkspaceMemberRoleSchema
>;

// Delete member
export const DeleteWorkspaceMemberSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
});
export type DeleteWorkspaceMemberInput = z.infer<
  typeof DeleteWorkspaceMemberSchema
>;

// Workspace member (from database)
export const WorkspaceMemberSchema = z.object({
  workspace_id: z.string().uuid(),
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
export type WorkspaceMember = z.infer<typeof WorkspaceMemberSchema>;

// List workspace members response
export const ListWorkspaceMembersSchema = z.array(WorkspaceMemberSchema);
export type ListWorkspaceMembers = z.infer<typeof ListWorkspaceMembersSchema>;
