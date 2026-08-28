import { z } from 'zod';

// -----------------------------------------------------------------------------
// Schemas
// -----------------------------------------------------------------------------

export const HubDataSchema = z.array(
  z.object({
    role: z.string(),
    library: z.object({
      id: z.string(),
      name: z.string(),
      created_at: z.string(),
    }),
    memberCount: z.number(),
    docCount: z.number(),
  })
);

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type HubData = z.input<typeof HubDataSchema>;
