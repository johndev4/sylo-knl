'use server';

import { createClient } from '@/lib/supabase/server';
import {
  joinInviteInputSchema,
  joinInviteOutputSchema,
  JoinInviteResult,
} from '@/features/library/invite/invite-schema';
import { getUser } from '@/lib/auth/get-user';
import { logger } from '@/lib/logging/logger';
import { getRequestId } from '@/lib/logging/request';
import { AppError } from '@/lib/errors/app-error';
import { ERROR_CODES } from '@/lib/errors/error-codes';
import { withActionErrorHandling } from '@/lib/errors/error-handler';

async function joinLibraryActionImpl(
  rawInviteCode: string
): Promise<JoinInviteResult> {
  const correlationId = getRequestId();
  const inputParsed = joinInviteInputSchema.safeParse(rawInviteCode);
  if (!inputParsed.success) {
    throw inputParsed.error;
  }

  const supabase = await createClient();
  await getUser();

  const { data, error } = await supabase.rpc('join_library_via_invite', {
    p_invite_code: inputParsed.data,
  });

  if (error) {
    throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, { cause: error });
  }

  const outputParsed = joinInviteOutputSchema.safeParse({
    success: true,
    data,
  });
  if (!outputParsed.success) {
    throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
      cause: outputParsed.error,
    });
  }

  logger.info('Library invite joined', { correlationId });
  return outputParsed.data;
}

export async function joinLibraryAction(rawInviteCode: string) {
  return withActionErrorHandling(() => joinLibraryActionImpl(rawInviteCode), {
    action: 'joinLibrary',
  });
}
