'use client';

import { Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { signUpWithEmail } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function RegisterFormInner() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  useEffect(() => {
    if (error) {
      toast.error(decodeURIComponent(error));
    }
  }, [error]);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Crea account</CardTitle>
        <p className="text-sm text-white/50">Prenota più velocemente e vedi il tuo storico</p>
      </CardHeader>
      <CardContent>
        {error && (
          <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {decodeURIComponent(error)}
          </p>
        )}
        <form action={signUpWithEmail} className="space-y-4">
          <div>
            <Label htmlFor="full_name">Nome e cognome</Label>
            <Input id="full_name" name="full_name" required className="mt-1" />
          </div>
          <div>
            <Label htmlFor="phone">Telefono</Label>
            <Input id="phone" name="phone" type="tel" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required minLength={6} className="mt-1" />
          </div>
          <Button type="submit" className="w-full">
            Registrati
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-white/50">
          Hai già un account?{' '}
          <Link href="/login" className="text-gold hover:underline">
            Accedi
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export function RegisterForm() {
  return (
    <Suspense fallback={<div className="h-96 w-full max-w-md animate-pulse rounded-lg bg-white/5" />}>
      <RegisterFormInner />
    </Suspense>
  );
}