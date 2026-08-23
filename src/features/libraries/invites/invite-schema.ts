import { z } from 'zod';

// ------------------------------------------------------------------------------
// Schemas
// ------------------------------------------------------------------------------

// GetInviteDetails Input schema
export const inviteCodeSchema = z.string().refine(
  (code) => {
    if (code.length !== 8) return false;
    // Check if it contains only valid base64url characters
    return /^[A-Za-z0-9_-]+$/.test(code);
  },
  { message: 'Invalid invite code format' }
);

// GetInviteDetails Output schema (safe details)
export const inviteDetailsSchema = z.object({
  libraryName: z.string(),
  role: z.string(),
  isValid: z.boolean(),
  isExpired: z.boolean(),
  isMaxed: z.boolean(),
  isActive: z.boolean(),
  inviteCode: z.string(),
});

// JoinLibraryAction Input Schema
export const joinInviteInputSchema = z
  .string()
  .min(1, 'Invite code is required');

// JoinLibraryAction Output Schema
export const joinInviteOutputSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
});

// ------------------------------------------------------------------------------
// Types
// ------------------------------------------------------------------------------

export type InviteDetails = z.infer<typeof inviteDetailsSchema>;
export type JoinInviteResult = z.infer<typeof joinInviteOutputSchema>;
