import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const LOGIN_PATH = '/login';
const HUB_PATH = '/hub';

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('[AUTH GUARD] Missing Supabase env vars');

    if (pathname.startsWith('/hub')) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = LOGIN_PATH;
      loginUrl.searchParams.set('redirect', `${pathname}${search}`);
      return NextResponse.redirect(loginUrl);
    }

    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set({ name, value, ...options });
        });

        response = NextResponse.next({ request });
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

  if (pathname.startsWith('/hub') && !isAuthenticated) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = LOGIN_PATH;
    loginUrl.searchParams.set('redirect', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === LOGIN_PATH && isAuthenticated) {
    const hubUrl = request.nextUrl.clone();
    hubUrl.pathname = HUB_PATH;
    return NextResponse.redirect(hubUrl);
  }

  return response;
}

export const config = {
  matcher: ['/hub/:path*', '/login', '/join/:path*'],
};
