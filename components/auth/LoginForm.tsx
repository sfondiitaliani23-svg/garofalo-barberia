'use client';

import { Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { signInWithEmail } from '@/lib/actions/auth';
import { OAuthLoginButtons } from '@/components/auth/OAuthLoginButtons';
import { getWhatsAppLink } from '@/lib/site-config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { safeDecodeURIComponent } from '@/lib/utils/site-origin';

function LoginFormInner({ authConfigured }: { authConfigured: boolean }) {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const redirect = searchParams.get('redirect') ?? '/area-cliente/dashboard';

  useEffect(() => {
    if (error) {
      toast.error(safeDecodeURIComponent(error));
    }
  }, [error]);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Accedi</CardTitle>
        <p className="text-sm text-white/50">
          Area cliente Garofalo Barberia — resti connesso per 2 mesi su questo dispositivo.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!authConfigured && !error && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            <p>Google e GitHub richiedono Supabase configurato su Vercel.</p>
            <p className="mt-2">
              Nel frattempo puoi{' '}
              <a href={getWhatsAppLink()} className="text-gold underline" target="_blank" rel="noopener noreferrer">
                prenotare su WhatsApp
              </a>
              .
            </p>
          </div>
        )}
        {error && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {safeDecodeURIComponent(error)}
          </p>
        )}
        <form action={signInWithEmail} className="space-y-4">
          <input type="hidden" name="redirect" value={redirect} />
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" className="mt-1" />
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
          <Button type="submit" className="w-full">
            Accedi
          </Button>
        </form>
        <OAuthLoginButtons redirectTo={redirect} disabled={!authConfigured} />
        <p className="text-center text-sm text-white/50">
          Non hai un account?{' '}
          <Link href="/register" className="text-gold hover:underline">
            Registrati
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export function LoginForm({ authConfigured }: { authConfigured: boolean }) {
  return (
    <Suspense fallback={<div className="h-96 w-full max-w-md animate-pulse rounded-lg bg-white/5" />}>
      <LoginFormInner authConfigured={authConfigured} />
    </Suspense>
  );
}