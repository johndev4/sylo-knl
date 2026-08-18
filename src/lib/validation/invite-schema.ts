import { z } from 'zod';

// ------------------------------------------------------------------------------
// GetInviteDetails schemas
// ------------------------------------------------------------------------------

// Input schema
export const inviteCodeSchema = z.string().refine(
  (code) => {
    if (code.length !== 8) return false;
    // Check if it contains only valid base64url characters
    return /^[A-Za-z0-9_-]+$/.test(code);
  },
  { message: 'Invalid invite code format' }
);

// Output schema (safe details)
export const inviteDetailsSchema = z.object({
  libraryName: z.string(),
  role: z.string(),
  isValid: z.boolean(),
  isExpired: z.boolean(),
  isMaxed: z.boolean(),
  isActive: z.boolean(),
  inviteCode: z.string(),
});

// Infer TypeScript type automatically from schema
export type InviteDetails = z.infer<typeof inviteDetailsSchema>;

// ------------------------------------------------------------------------------
// JoinLibraryAction schemas
// ------------------------------------------------------------------------------

// Input Schema
export const joinInviteInputSchema = z
  .string()
  .min(1, 'Invite code is required');

// Output Schema
export const joinInviteOutputSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
});

// Infer TypeScript type automatically from schema
export type JoinInviteResult = z.infer<typeof joinInviteOutputSchema>;
