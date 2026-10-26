import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/auth';
import { isStaffRole } from '@/lib/auth/staff';
import LoginView from './view';
import { alternatesFor } from '@/lib/i18n/seo';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Accedi',
  robots: { index: false, follow: true },
  alternates: alternatesFor('/login', 'it'),
};

// Chi ha già fatto l'accesso non deve rifarlo: va subito alla sua area.
export default async function Page({ searchParams }: { searchParams: Promise<{ redirect?: string }> }) {
  const profile = await getProfile();
  if (profile) {
    const wanted = (await searchParams).redirect;
    const safe = typeof wanted === 'string' && wanted.startsWith('/') && !wanted.startsWith('//') ? wanted : null;
    redirect(isStaffRole(profile.role) ? '/admin/dashboard' : safe ?? '/area-cliente/dashboard');
  }
  return <LoginView lang="it" />;
}
