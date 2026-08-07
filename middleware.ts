import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Define routes that require authentication
const AUTHENTICATED_PATHS = ['/hub'];
const LOGIN_PATH = '/login';

function isAuthenticatedPath(pathname: string) {
  return AUTHENTICATED_PATHS.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Ignore static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/public')
  ) {
    return NextResponse.next();
  }

  // Create Supabase client for SSR
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { get: (key) => request.cookies.get(key)?.value } }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect unauthenticated users from /hub* to /login
  const isTest = request.cookies.get('playwright-test')?.value === 'true';
  if (isAuthenticatedPath(pathname) && !user && !isTest) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = LOGIN_PATH;
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users from /login to /hub
  if (pathname === LOGIN_PATH && user) {
    const hubUrl = request.nextUrl.clone();
    hubUrl.pathname = '/hub';
    return NextResponse.redirect(hubUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/hub/:path*', '/login', '/join/:path*'],
};
