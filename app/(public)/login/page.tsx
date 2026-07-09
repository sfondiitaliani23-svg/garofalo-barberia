import { LoginForm } from '@/components/auth/LoginForm';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Accedi' };

export default function LoginPage() {
  return (
    <section className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <LoginForm authConfigured={isSupabaseConfigured()} />
    </section>
  );
}