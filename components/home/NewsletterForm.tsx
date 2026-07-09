'use client';

import { SITE_CONFIG } from '@/lib/site-config';

export function NewsletterForm() {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.querySelector<HTMLInputElement>('#newsletter-email');
    const email = input?.value?.trim();
    if (!email) return;

    const subject = encodeURIComponent('Iscrizione newsletter — Garofalo Barberia');
    const body = encodeURIComponent(
      `Ciao, vorrei iscrivermi alla newsletter di Garofalo Barberia.\n\nEmail: ${email}`
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
        placeholder="Inserisci la tua email"
        required
        autoComplete="email"
      />
      <button type="submit" className="newsletter-submit">Invia</button>
    </form>
  );
}