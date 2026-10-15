'use client';

import { Suspense, useEffect } from 'react';
import { LocLink as Link } from '@/components/i18n/LocLink';
import { useLang } from '@/components/i18n/LangProvider';
import { L } from '@/lib/i18n';
import { translateMessage } from '@/lib/i18n/content-booking';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { signUpWithEmail } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { safeDecodeURIComponent } from '@/lib/utils/site-origin';

function RegisterFormInner() {
  const lang = useLang();
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  useEffect(() => {
    if (error) {
      toast.error(translateMessage(lang, safeDecodeURIComponent(error)));
    }
  }, [error, lang]);

  return (
    <Card className="w-full max-w-md border border-white/10 bg-[#111] shadow-2xl relative overflow-hidden transition-all duration-300">
      {/* Indicatore dorato in cima */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-gold to-transparent" />

      <CardHeader className="space-y-1">
        <CardTitle className="font-display text-2xl uppercase tracking-wide text-gold">{L(lang, 'Crea account', 'Create account')}</CardTitle>
        <p className="text-xs text-white/60">{L(lang, 'Prenota più velocemente e vedi il tuo storico', 'Book faster and see your history')}</p>
      </CardHeader>
      <CardContent>
        {error && (
          <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {translateMessage(lang, safeDecodeURIComponent(error))}
          </p>
        )}
        <form action={signUpWithEmail} className="space-y-4">
          <div>
            <Label htmlFor="full_name" className="text-xs text-white/70">{L(lang, 'Nome e cognome', 'Full name')}</Label>
            <Input 
              id="full_name" 
              name="full_name" 
              required 
              className="mt-1 bg-[#1a1a1a] border-white/10 text-white placeholder-white/30 focus:border-gold/50" 
            />
          </div>
          <div>
            <Label htmlFor="phone" className="text-xs text-white/70">{L(lang, 'Telefono', 'Phone')}</Label>
            <Input 
              id="phone" 
              name="phone" 
              type="tel" 
              className="mt-1 bg-[#1a1a1a] border-white/10 text-white placeholder-white/30 focus:border-gold/50" 
            />
          </div>
          <div>
            <Label htmlFor="email" className="text-xs text-white/70">Email</Label>
            <Input 
              id="email" 
              name="email" 
              type="email" 
              required 
              autoComplete="email" 
              className="mt-1 bg-[#1a1a1a] border-white/10 text-white placeholder-white/30 focus:border-gold/50" 
            />
          </div>
          <div>
            <Label htmlFor="password" className="text-xs text-white/70">Password</Label>
            <Input 
              id="password" 
              name="password" 
              type="password" 
              required 
              minLength={6} 
              className="mt-1 bg-[#1a1a1a] border-white/10 text-white placeholder-white/30 focus:border-gold/50" 
            />
          </div>
          <Button type="submit" className="w-full bg-gold hover:bg-gold-light text-black py-5 font-semibold transition-all duration-300">
            {L(lang, 'Registrati', 'Sign up')}
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-white/60 border-t border-white/5 pt-4">
          {L(lang, 'Hai già un account?', 'Already have an account?')}{' '}
          <Link href="/login" className="text-gold hover:underline font-semibold">
            {L(lang, 'Accedi', 'Sign in')}
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