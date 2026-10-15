'use client';

import { SITE_CONFIG } from '@/lib/site-config';
import { useLang } from '@/components/i18n/LangProvider';
import { L } from '@/lib/i18n';

export function NewsletterForm() {
  const lang = useLang();
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.querySelector<HTMLInputElement>('#newsletter-email');
    const email = input?.value?.trim();
    if (!email) return;

    const subject = encodeURIComponent(L(lang, 'Iscrizione newsletter — Garofalo Barberia', 'Newsletter sign-up — Garofalo Barberia'));
    const body = encodeURIComponent(
      L(
        lang,
        `Ciao, vorrei iscrivermi alla newsletter di Garofalo Barberia.\n\nEmail: ${email}`,
        `Hello, I would like to subscribe to the Garofalo Barberia newsletter.\n\nEmail: ${email}`,
      )
    );
    window.open(
      `https://mail.google.com/mail/?view=cm&fs=1&to=${SITE_CONFIG.email}&su=${subject}&body=${body}`,
      '_blank',
      'noopener,noreferrer'
    );
  }

  return (
    <form className="newsletter-form" onSubmit={handleSubmit} noValidate>
      <label className="sr-only" htmlFor="newsletter-email">Email</label>
      <input
        type="email"
        id="newsletter-email"
        name="email"
        className="newsletter-input"
        placeholder={L(lang, 'Inserisci la tua email', 'Enter your email')}
        required
        autoComplete="email"
      />
      <button type="submit" className="newsletter-submit">{L(lang, 'Invia', 'Send')}</button>
    </form>
  );
}