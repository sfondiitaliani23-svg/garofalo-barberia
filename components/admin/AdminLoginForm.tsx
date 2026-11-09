'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { safeDecodeURIComponent } from '@/lib/utils/site-origin';

function AdminLoginFormInner() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Secondo passaggio (09/11/2026): codice dell'app di autenticazione o passkey, se attivati in Eliseo → Profilo → Sicurezza.
  const [mfa, setMfa] = useState<{ totp?: string; passkey?: string } | null>(null);
  const [code, setCode] = useState('');

  useEffect(() => {
    const urlError = searchParams.get('error');
    if (urlError) setError(safeDecodeURIComponent(urlError));
    if (searchParams.get('mfa') === '1') void checkMfa();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  /** true se serve il secondo passaggio (e prepara il modulo), false se si può entrare. */
  async function checkMfa(): Promise<boolean> {
    const supabase = createClient();
    if (!supabase) return false;
    try {
      const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (!data || data.nextLevel !== 'aal2' || data.currentLevel === 'aal2') return false;
      const { data: f } = await supabase.auth.mfa.listFactors();
      const verified = (f?.all ?? []).filter((x) => x.status === 'verified');
      const totp = verified.find((x) => x.factor_type === 'totp')?.id;
      const passkey = verified.find((x) => x.factor_type === 'webauthn')?.id;
      if (!totp && !passkey) return false;
      setMfa({ totp, passkey });
      return true;
    } catch {
      return false;
    }
  }

  async function verifyCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = createClient();
    if (!supabase || !mfa?.totp) return;
    setLoading(true);
    setError(null);
    const { error: e } = await supabase.auth.mfa.challengeAndVerify({ factorId: mfa.totp, code: code.replace(/\s/g, '') });
    if (e) {
      setError('Codice non valido. Riprova con il codice nuovo dell\'app.');
      setLoading(false);
      return;
    }
    window.location.assign('/admin/dashboard');
  }

  async function withPasskey() {
    const supabase = createClient();
    if (!supabase || !mfa?.passkey) return;
    setLoading(true);
    setError(null);
    const { error: e } = await supabase.auth.mfa.webauthn.authenticate({ factorId: mfa.passkey, webauthn: {} });
    if (e) {
      setError('Passkey non riconosciuta. Riprova o usa il codice.');
      setLoading(false);
      return;
    }
    window.location.assign('/admin/dashboard');
  }

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

    if (profile?.role !== 'admin' && profile?.role !== 'dipendente' && profile?.role !== 'tester') {
      await supabase.auth.signOut();
      setError('Questo account non ha permessi admin.');
      setLoading(false);
      return;
    }

    if (await checkMfa()) {
      setLoading(false);
      return;
    }

    // Navigazione completa: evita che la cache del router riporti alla pagina di accesso (serviva un secondo accesso).
    window.location.assign('/admin/dashboard');
  }

  if (mfa) {
    return (
      <form onSubmit={verifyCode} className="space-y-4">
        <p className="text-sm text-white/80">Verifica in due passaggi: conferma che sei tu.</p>
        {error && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
        )}
        {mfa.passkey && (
          <Button type="button" className="w-full" disabled={loading} onClick={withPasskey}>
            Usa la passkey (impronta, volto o blocco schermo)
          </Button>
        )}
        {mfa.totp && (
          <>
            <div>
              <Label htmlFor="mfa-code">Codice dell&apos;app di autenticazione</Label>
              <Input
                id="mfa-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9 ]{6,7}"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Verifica...' : 'Conferma codice'}
            </Button>
          </>
        )}
      </form>
    );
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