'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

async function getSiteOrigin() {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');

  const headersList = await headers();
  const host = headersList.get('x-forwarded-host') ?? headersList.get('host');
  const protocol = headersList.get('x-forwarded-proto') ?? 'https';
  if (host) return `${protocol}://${host}`;

  return 'https://garofalo-barberia.vercel.app';
}

export async function signInWithEmail(formData: FormData) {
  const supabase = await createClient();
  if (!supabase) redirect('/login?error=Database%20non%20configurato');
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const redirectTo = (formData.get('redirect') as string) || '/area-cliente/dashboard';

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const loginPath = redirectTo.startsWith('/admin') ? '/admin/login' : '/login';
    redirect(`${loginPath}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath('/', 'layout');
  redirect(redirectTo);
}

export async function signUpWithEmail(formData: FormData) {
  const supabase = await createClient();
  if (!supabase) redirect('/register?error=Database%20non%20configurato');
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const fullName = formData.get('full_name') as string;
  const phone = formData.get('phone') as string;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, role: 'customer' },
    },
  });

  if (error) {
    redirect(`/register?error=${encodeURIComponent(error.message)}`);
  }

  if (phone) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').update({ phone, full_name: fullName }).eq('id', user.id);
    }
  }

  revalidatePath('/', 'layout');
  redirect('/area-cliente/dashboard');
}

const OAUTH_LABELS: Record<'google' | 'github', string> = {
  google: 'Google',
  github: 'GitHub',
};

export async function signInWithOAuth(formData: FormData) {
  const provider = formData.get('provider') as 'google' | 'github';
  const redirectTo = (formData.get('redirect') as string) || '/area-cliente/dashboard';

  if (provider !== 'google' && provider !== 'github') {
    redirect('/login?error=Provider%20non%20valido');
  }

  const supabase = await createClient();
  if (!supabase) {
    redirect(
      `/login?error=${encodeURIComponent(`Accesso con ${OAUTH_LABELS[provider]} non disponibile: database non configurato su Vercel.`)}`
    );
  }

  const origin = await getSiteOrigin();
  const callbackUrl = `${origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`;

  const options: {
    redirectTo: string;
    queryParams?: Record<string, string>;
  } = { redirectTo: callbackUrl };

  if (provider === 'google') {
    options.queryParams = { access_type: 'offline', prompt: 'consent' };
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options,
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  if (!data?.url) {
    redirect(
      `/login?error=${encodeURIComponent(`Impossibile avviare ${OAUTH_LABELS[provider]}. Abilita il provider in Supabase → Authentication → Providers.`)}`
    );
  }

  redirect(data.url);
}

/** @deprecated Usa signInWithOAuth */
export async function signInWithGoogle(formData: FormData) {
  formData.set('provider', 'google');
  return signInWithOAuth(formData);
}

export async function signOut() {
  const supabase = await createClient();
  if (supabase) await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  if (!supabase) redirect('/area-cliente/profilo?error=Database%20non%20configurato');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: formData.get('full_name') as string,
      phone: formData.get('phone') as string,
      hair_preferences: formData.get('hair_preferences') as string,
      personal_notes: formData.get('personal_notes') as string,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) redirect(`/area-cliente/profilo?error=${encodeURIComponent(error.message)}`);

  revalidatePath('/area-cliente/profilo');
  redirect('/area-cliente/profilo?saved=1');
}