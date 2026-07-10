import { createBrowserClient } from '@supabase/ssr';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { getCustomerSessionCookieOptions } from '@/lib/supabase/session-config';

export function createClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: getCustomerSessionCookieOptions(),
    }
  );
}