'use client';

import { useEffect, useState } from 'react';
import { LocLink as Link } from '@/components/i18n/LocLink';
import { createClient } from '@/lib/supabase/client';
import { L, type Lang } from '@/lib/i18n';

/**
 * Invito sotto le storie del Wrapped. Chi ha già fatto l'accesso non vede «Accedi»:
 * vede dove trova il suo anno e la sua area. La pagina è statica, quindi il controllo
 * si fa nel browser; finché non si sa, il riquadro resta invisibile (niente «Accedi» a lampo).
 */
export function WrappedCta({ lang }: { lang: Lang }) {
  const [state, setState] = useState<{ in: boolean; name: string | null } | null>(null);

  useEffect(() => {
    let alive = true;
    let cookie = false;
    try {
      cookie = /sb-[^=]+-auth-token/.test(document.cookie);
    } catch {
      cookie = false;
    }
    const supabase = cookie ? createClient() : null;
    if (!supabase) {
      setState({ in: false, name: null });
      return;
    }
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!alive) return;
        const name = session?.user?.user_metadata?.full_name?.split(' ')[0] ?? null;
        setState({ in: Boolean(session?.user), name });
      })
      .catch(() => alive && setState({ in: false, name: null }));
    return () => {
      alive = false;
    };
  }, []);

  const hidden = state === null;
  const loggedIn = Boolean(state?.in);

  return (
    <div className="cp-cta" style={{ marginTop: '3rem', visibility: hidden ? 'hidden' : undefined }} aria-hidden={hidden || undefined}>
      {loggedIn ? (
        <>
          <p>
            {state?.name
              ? L(lang, `Ciao ${state.name}! Il tuo Wrapped è il cerchio «Il tuo anno» qui sopra: compare dopo la tua prima visita.`, `Hi ${state.name}! Your Wrapped is the «Your year» circle above: it appears after your first visit.`)
              : L(lang, 'Il tuo Wrapped è il cerchio «Il tuo anno» qui sopra: compare dopo la tua prima visita.', 'Your Wrapped is the «Your year» circle above: it appears after your first visit.')}
          </p>
          <div className="cp-cta-actions">
            <Link href="/prenota" className="btn-primary">{L(lang, 'Prenota', 'Book')}</Link>
            <Link href="/area-cliente/dashboard" className="cp-ghost">{L(lang, 'La tua area', 'Your area')}</Link>
          </div>
        </>
      ) : (
        <>
          <p>{L(lang, 'Vuoi il tuo Wrapped? Accedi: contiamo visite, tempo in poltrona e il tuo servizio preferito.', 'Want your Wrapped? Sign in: we count your visits, time in the chair and your favourite service.')}</p>
          <div className="cp-cta-actions">
            <Link href="/login" className="btn-primary">{L(lang, 'Accedi', 'Sign in')}</Link>
            <Link href="/prenota" className="cp-ghost">{L(lang, 'Prenota', 'Book')}</Link>
          </div>
        </>
      )}
    </div>
  );
}
