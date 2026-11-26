import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logging/logger';
import { getRequestContext } from '@/lib/logging/request';
import { getURL } from '@/lib/auth/utils';

function getSafeRedirectUrl(path: string) {
  const appUrl = new URL(getURL());

  try {
    const redirectUrl = new URL(path, appUrl);
    return redirectUrl.origin === appUrl.origin
      ? redirectUrl
      : new URL('/hub', appUrl);
  } catch {
    return new URL('/hub', appUrl);
  }
}

export async function GET(request: Request) {
  const context = getRequestContext(request);
  const startedAt = performance.now();
  logger.info('Auth callback request received', context);
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/hub';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      logger.info('Auth callback exchange completed', {
        ...context,
        duration: Math.max(0, Math.round(performance.now() - startedAt)),
        statusCode: 307,
      });
      return NextResponse.redirect(getSafeRedirectUrl(next));
    }
    logger.warn('Auth callback session exchange failed', {
      ...context,
      statusCode: 401,
      error,
    });
  }

  // return the user to an error page with instructions
  logger.warn('Auth callback missing or invalid code', {
    ...context,
    statusCode: 307,
  });
  return NextResponse.redirect(new URL('/login?error=true', getURL()));
}
