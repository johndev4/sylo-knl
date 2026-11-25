import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const LOGIN_PATH = '/login';
const PROTECTED_ROUTES = ['/hub', '/chat', '/account'];

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const response = NextResponse.next({ request });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set({ name, value, ...options });
        });
      },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  const isAuthenticated = Boolean(user) && !error;

  // Redirect unauthenticated users away from protected routes
  if (
    PROTECTED_ROUTES.some((route) => pathname.startsWith(route)) &&
    !isAuthenticated
  ) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = LOGIN_PATH;
    loginUrl.searchParams.set('redirect', `${pathname}${search}`);
    const redirectResponse = NextResponse.redirect(loginUrl);
    return redirectResponse;
  }

  // Redirect authenticated users away from the login page
  if (pathname === LOGIN_PATH && isAuthenticated) {
    const hubUrl = request.nextUrl.clone();
    hubUrl.pathname = '/hub';
    hubUrl.searchParams.delete('redirect'); // Remove the redirect param to avoid redirect loops
    const redirectResponse = NextResponse.redirect(hubUrl);
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: [
    '/hub/:path*',
    '/chat/:path*',
    '/account/:path*',
    '/login',
    '/join/:path*',
  ],
};
