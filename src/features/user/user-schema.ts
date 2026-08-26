import { VALID_TIMEZONES } from '@/lib/constants';
import { z } from 'zod';

// -----------------------------------------------------------------------------
// Schemas
// -----------------------------------------------------------------------------

export const UpdateProfileInputSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  bio: z.string().max(500).trim().optional(),
  timezone: z
    .union([
      z.enum(VALID_TIMEZONES as [string, ...string[]]),
      z.literal(''),
      z.null(),
    ])
    .optional()
    .transform((v) => (v === '' || v === null ? null : v)),
  useAvatarUrl: z.boolean().optional(),
});

export const UserProfileSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  name: z.string().optional(),
  avatarUrl: z.url().optional(),
  bio: z.string().optional(),
  timezone: z.string().nullable().optional(),
  useAvatarUrl: z.boolean(),
});

export const ProfileDropdownUserInfoSchema = z.object({
  email: z.email(),
  name: z.string().optional(),
  avatarUrl: z.url().optional(),
  useAvatarUrl: z.boolean(),
});

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type UpdateProfileInput = z.input<typeof UpdateProfileInputSchema>;
export type UserProfile = z.input<typeof UserProfileSchema>;
export type ProfileDropdownUserInfo = z.input<
  typeof ProfileDropdownUserInfoSchema
>;
