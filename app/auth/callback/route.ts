import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { ensureProfileForAuthUser } from '@/lib/auth/ensure-profile';
import {
  applyCustomerSessionCookieOptions,
  CUSTOMER_SESSION_MAX_AGE_SECONDS,
  CUSTOMER_SESSION_UNTIL_COOKIE,
  getCustomerSessionCookieOptions,
  getCustomerSessionExpiryDate,
} from '@/lib/supabase/session-config';
import { resolveSiteOriginFromRequest } from '@/lib/utils/site-origin';

export async function GET(request: NextRequest) {
  const origin = resolveSiteOriginFromRequest(request);
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/area-cliente/dashboard';
  const oauthError = searchParams.get('error_description') ?? searchParams.get('error');

  if (oauthError) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(oauthError)}`);
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent('Accesso annullato o non completato.')}`
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent('Database non configurato.')}`
    );
  }

  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/area-cliente/dashboard';
  const redirectResponse = NextResponse.redirect(`${origin}${safeNext}`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          applyCustomerSessionCookieOptions(cookiesToSet).forEach(({ name, value, options }) => {
            redirectResponse.cookies.set(name, value, options);
          });
        },
      },
      cookieOptions: getCustomerSessionCookieOptions(),
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  if (data.user) {
    await ensureProfileForAuthUser(data.user);
  }

  if (!safeNext.startsWith('/admin')) {
    redirectResponse.cookies.set(
      CUSTOMER_SESSION_UNTIL_COOKIE,
      getCustomerSessionExpiryDate().toISOString(),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: CUSTOMER_SESSION_MAX_AGE_SECONDS,
      }
    );
  }

  return redirectResponse;
}