'use client';

// Ritorno dall'accesso con Google (strada di riserva, 14/11/2026). Vedi lib/auth/google-redirect.ts.
import { useEffect, useState } from 'react';
import { signInWithGoogleCredential } from '@/lib/actions/auth';
import { readGoogleReturn } from '@/lib/auth/google-redirect';
import { Attesa } from '@/components/ui/attesa';

function safeNext(value: string) {
  return value.startsWith('/') && !value.startsWith('//') ? value : '/area-cliente/dashboard';
}

export default function GoogleReturnPage() {
  const [en, setEn] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const isEn = document.cookie.includes('gb_lang=en');
    setEn(isEn);
    const data = readGoogleReturn(window.location.hash);
    window.history.replaceState(null, '', '/auth/google');
    if (!data) {
      setFailed(true);
      setMessage(isEn ? 'Google sign-in did not complete. Go back and try again.' : 'Accesso con Google non riuscito. Torna indietro e riprova.');
      return;
    }
    signInWithGoogleCredential(data.idToken, data.raw).then((result) => {
      if (result && 'error' in result) {
        setFailed(true);
        setMessage(result.error);
        return;
      }
      window.location.assign(safeNext(data.next));
    });
  }, []);

  return (
    <main className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-6 text-center">
      {failed ? (
        <>
          <p role="status" className="text-base text-white/80">{message}</p>
          <a href={en ? '/en/login' : '/login'} className="text-sm text-gold underline">
            {en ? 'Back to sign in' : 'Torna all’accesso'}
          </a>
        </>
      ) : (
        <Attesa className="text-base">{en ? 'Signing in with Google…' : 'Entro con Google…'}</Attesa>
      )}
    </main>
  );
}
