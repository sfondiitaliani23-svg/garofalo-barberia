'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { submitApplicationAction } from '@/lib/actions/site-inbox';

export function ApplicationForm() {
  const [f, setF] = useState({ name: '', phone: '', email: '', role: 'Barbiere', experience: 'Da 1 a 3 anni', link: '', message: '', consent: false, website: '' });
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((v) => ({ ...v, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await submitApplicationAction(f);
      if (res.ok) setDone(true);
      else setError(res.error);
    });
  }

  if (done) {
    return (
      <div className="cp-done" role="status">
        <h2>Candidatura inviata.</h2>
        <p>Grazie! La leggiamo con calma e, se c’è posto per te, ti chiamiamo noi.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="cp-form" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="cp-field">
          <label htmlFor="ap-name">Nome e cognome *</label>
          <input id="ap-name" autoComplete="name" value={f.name} onChange={set('name')} required />
        </div>
        <div className="cp-field">
          <label htmlFor="ap-phone">Telefono *</label>
          <input id="ap-phone" type="tel" autoComplete="tel" inputMode="tel" value={f.phone} onChange={set('phone')} required />
        </div>
      </div>
      <div className="cp-field">
        <label htmlFor="ap-email">Email</label>
        <input id="ap-email" type="email" autoComplete="email" value={f.email} onChange={set('email')} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="cp-field">
          <label htmlFor="ap-role">Ruolo</label>
          <select id="ap-role" value={f.role} onChange={set('role')}>
            <option>Barbiere</option>
            <option>Apprendista</option>
            <option>Altro</option>
          </select>
        </div>
        <div className="cp-field">
          <label htmlFor="ap-exp">Esperienza</label>
          <select id="ap-exp" value={f.experience} onChange={set('experience')}>
            <option>Nessuna, voglio imparare</option>
            <option>Meno di 1 anno</option>
            <option>Da 1 a 3 anni</option>
            <option>Più di 3 anni</option>
          </select>
        </div>
      </div>
      <div className="cp-field">
        <label htmlFor="ap-link">Instagram o portfolio</label>
        <input id="ap-link" value={f.link} onChange={set('link')} placeholder="@tuoprofilo oppure https://..." />
        <p className="cp-hint">Facoltativo, ma ci aiuta a vedere i tuoi lavori.</p>
      </div>
      <div className="cp-field">
        <label htmlFor="ap-msg">Raccontaci di te</label>
        <textarea id="ap-msg" value={f.message} maxLength={2000} onChange={set('message')} placeholder="Dove hai lavorato, cosa sai fare, cosa vuoi imparare." />
      </div>
      <label className="cp-check">
        <input type="checkbox" checked={f.consent} onChange={set('consent')} />
        <span>
          Acconsento al trattamento dei miei dati solo per valutare la candidatura. I dati restano al salone e vengono cancellati a fine selezione.{' '}
          <Link href="/privacy" className="cp-inline-link">Privacy</Link>
        </span>
      </label>
      <div className="cp-hp" aria-hidden>
        <label htmlFor="ap-website">Sito web</label>
        <input id="ap-website" tabIndex={-1} autoComplete="off" value={f.website} onChange={set('website')} />
      </div>
      {error && <p className="cp-error" role="alert">{error}</p>}
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? 'Invio…' : 'Invia la candidatura'}
      </button>
    </form>
  );
}
