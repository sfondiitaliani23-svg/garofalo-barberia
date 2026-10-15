'use client';

import { useState, useTransition } from 'react';
import { LocLink as Link } from '@/components/i18n/LocLink';
import { useLang } from '@/components/i18n/LangProvider';
import { L } from '@/lib/i18n';
import { applicationErrorText } from '@/lib/i18n/content-info';
import { submitApplicationAction } from '@/lib/actions/site-inbox';

export function ApplicationForm() {
  const lang = useLang();
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
      else setError(applicationErrorText(lang, res.error));
    });
  }

  if (done) {
    return (
      <div className="cp-done" role="status">
        <h2>{L(lang, 'Candidatura inviata.', 'Application sent.')}</h2>
        <p>{L(lang, 'Grazie! La leggiamo con calma e, se c’è posto per te, ti chiamiamo noi.', 'Thank you! We will read it carefully and, if we have a place for you, we will call you.')}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="cp-form" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="cp-field">
          <label htmlFor="ap-name">{L(lang, 'Nome e cognome *', 'Full name *')}</label>
          <input id="ap-name" autoComplete="name" value={f.name} onChange={set('name')} required />
        </div>
        <div className="cp-field">
          <label htmlFor="ap-phone">{L(lang, 'Telefono *', 'Phone *')}</label>
          <input id="ap-phone" type="tel" autoComplete="tel" inputMode="tel" value={f.phone} onChange={set('phone')} required />
        </div>
      </div>
      <div className="cp-field">
        <label htmlFor="ap-email">Email</label>
        <input id="ap-email" type="email" autoComplete="email" value={f.email} onChange={set('email')} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="cp-field">
          <label htmlFor="ap-role">{L(lang, 'Ruolo', 'Role')}</label>
          <select id="ap-role" value={f.role} onChange={set('role')}>
            <option value="Barbiere">{L(lang, 'Barbiere', 'Barber')}</option>
            <option value="Apprendista">{L(lang, 'Apprendista', 'Apprentice')}</option>
            <option value="Altro">{L(lang, 'Altro', 'Other')}</option>
          </select>
        </div>
        <div className="cp-field">
          <label htmlFor="ap-exp">{L(lang, 'Esperienza', 'Experience')}</label>
          <select id="ap-exp" value={f.experience} onChange={set('experience')}>
            <option value="Nessuna, voglio imparare">{L(lang, 'Nessuna, voglio imparare', 'None, I want to learn')}</option>
            <option value="Meno di 1 anno">{L(lang, 'Meno di 1 anno', 'Less than 1 year')}</option>
            <option value="Da 1 a 3 anni">{L(lang, 'Da 1 a 3 anni', '1 to 3 years')}</option>
            <option value="Più di 3 anni">{L(lang, 'Più di 3 anni', 'More than 3 years')}</option>
          </select>
        </div>
      </div>
      <div className="cp-field">
        <label htmlFor="ap-link">{L(lang, 'Instagram o portfolio', 'Instagram or portfolio')}</label>
        <input id="ap-link" value={f.link} onChange={set('link')} placeholder={L(lang, '@tuoprofilo oppure https://...', '@yourprofile or https://...')} />
        <p className="cp-hint">{L(lang, 'Facoltativo, ma ci aiuta a vedere i tuoi lavori.', 'Optional, but it helps us see your work.')}</p>
      </div>
      <div className="cp-field">
        <label htmlFor="ap-msg">{L(lang, 'Raccontaci di te', 'Tell us about yourself')}</label>
        <textarea id="ap-msg" value={f.message} maxLength={2000} onChange={set('message')} placeholder={L(lang, 'Dove hai lavorato, cosa sai fare, cosa vuoi imparare.', 'Where you have worked, what you can do, what you want to learn.')} />
      </div>
      <label className="cp-check">
        <input type="checkbox" checked={f.consent} onChange={set('consent')} />
        <span>
          {L(
            lang,
            'Acconsento al trattamento dei miei dati solo per valutare la candidatura. I dati restano al salone e vengono cancellati a fine selezione.',
            'I agree to the processing of my data only to assess my application. The data stays with the barbershop and is deleted at the end of the selection.',
          )}{' '}
          <Link href="/privacy" className="cp-inline-link">Privacy</Link>
        </span>
      </label>
      <div className="cp-hp" aria-hidden>
        <label htmlFor="ap-website">{L(lang, 'Sito web', 'Website')}</label>
        <input id="ap-website" tabIndex={-1} autoComplete="off" value={f.website} onChange={set('website')} />
      </div>
      {error && <p className="cp-error" role="alert">{error}</p>}
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? L(lang, 'Invio…', 'Sending…') : L(lang, 'Invia la candidatura', 'Send application')}
      </button>
    </form>
  );
}
