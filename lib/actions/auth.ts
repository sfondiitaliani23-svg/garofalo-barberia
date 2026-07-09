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

export async function signInWithGoogle(formData: FormData) {
  const supabase = await createClient();
  const redirectTo = (formData.get('redirect') as string) || '/area-cliente/dashboard';

  if (!supabase) {
    redirect(
      `/login?error=${encodeURIComponent('Accesso con Google non disponibile: database non configurato.')}`
    );
  }

  const origin = await getSiteOrigin();
  const callbackUrl = `${origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: callbackUrl,
      queryParams: { access_type: 'offline', prompt: 'consent' },
    },
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  if (!data?.url) {
    redirect(
      `/login?error=${encodeURIComponent('Impossibile avviare Google. Verifica che il provider Google sia attivo su Supabase.')}`
    );
  }

  redirect(data.url);
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