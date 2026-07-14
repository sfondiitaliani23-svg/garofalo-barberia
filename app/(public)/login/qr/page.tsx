import { isSupabaseConfigured } from '@/lib/supabase/config';
import { QrAuthHandler } from '@/components/auth/QrAuthHandler';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Autorizza Accesso PC' };

export default async function QrLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const params = await searchParams;
  const sessionId = params.id;

  return (
    <section className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <QrAuthHandler sessionId={sessionId} authConfigured={isSupabaseConfigured()} />
    </section>
  );
}
