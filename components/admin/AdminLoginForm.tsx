'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { safeDecodeURIComponent } from '@/lib/utils/site-origin';

function AdminLoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const urlError = searchParams.get('error');
    if (urlError) setError(safeDecodeURIComponent(urlError));
  }, [searchParams]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const supabase = createClient();
    if (!supabase) {
      setError('Database non configurato su Vercel.');
      setLoading(false);
      return;
    }

    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message === 'Invalid login credentials'
        ? 'Email o password non corretti.'
        : signInError.message);
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();

    if (profile?.role !== 'admin') {
      await supabase.auth.signOut();
      setError('Questo account non ha permessi admin.');
      setLoading(false);
      return;
    }

    router.push('/admin/dashboard');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-1"
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Accesso in corso...' : 'Accedi'}
      </Button>
    </form>
  );
}

export function AdminLoginForm() {
  return (
    <Suspense fallback={<div className="h-48 animate-pulse rounded-lg bg-white/5" />}>
      <AdminLoginFormInner />
    </Suspense>
  );
}