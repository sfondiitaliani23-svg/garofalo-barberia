import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import {
  applyCustomerSessionCookieOptions,
  CUSTOMER_SESSION_UNTIL_COOKIE,
  getCustomerSessionCookieOptions,
  isCustomerSessionExpired,
} from '@/lib/supabase/session-config';

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return NextResponse.next();

  const pathname = request.nextUrl.pathname;

  const isAreaCliente = pathname.startsWith('/area-cliente');
  const isAdminProtected = pathname.startsWith('/admin') && pathname !== '/admin/login';

  // Per tutte le pagine e risorse pubbliche, bypassa le chiamate di rete Supabase per un TTFB istantaneo
  if (!isAreaCliente && !isAdminProtected) {
    return NextResponse.next({ request });
  }

  // Verifica presenza di cookie di sessione Supabase prima di effettuare chiamate di rete
  const allCookies = request.cookies.getAll();
  const hasAuthCookie = allCookies.some((c) => c.name.startsWith('sb-') && c.name.includes('-auth-token'));

  if (!hasAuthCookie) {
    if (isAreaCliente) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
    if (isAdminProtected) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/login';
      return NextResponse.redirect(url);
    }
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          const persistentCookies = applyCustomerSessionCookieOptions(cookiesToSet);
          persistentCookies.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          persistentCookies.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
      cookieOptions: getCustomerSessionCookieOptions(),
    }
  );

  const sessionUntil = request.cookies.get(CUSTOMER_SESSION_UNTIL_COOKIE)?.value;

  if (isAreaCliente && isCustomerSessionExpired(sessionUntil)) {
    await supabase.auth.signOut();
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    url.searchParams.set('error', 'La sessione è scaduta dopo 2 mesi. Accedi di nuovo.');
    const expiredResponse = NextResponse.redirect(url);
    expiredResponse.cookies.delete(CUSTOMER_SESSION_UNTIL_COOKIE);
    return expiredResponse;
  }

  const { data: { user } } = await supabase.auth.getUser();

  let role: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    role = profile?.role ?? 'customer';
  }

  if (isAreaCliente) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
    if (role === 'admin') {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/dashboard';
      return NextResponse.redirect(url);
    }
  }

  if (isAdminProtected) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/login';
      return NextResponse.redirect(url);
    }
    if (role !== 'admin') {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};