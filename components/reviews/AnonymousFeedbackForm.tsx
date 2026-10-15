'use client';

import { useState, useTransition } from 'react';
import { LocLink as Link } from '@/components/i18n/LocLink';
import { useLang } from '@/components/i18n/LangProvider';
import { L } from '@/lib/i18n';
import { feedbackErrorText } from '@/lib/i18n/content-team';
import { Star } from 'lucide-react';
import { submitFeedbackAction } from '@/lib/actions/site-inbox';
import { SITE_CONFIG } from '@/lib/site-config';

const LABELS = ['', 'Male', 'Così così', 'Bene', 'Molto bene', 'Benissimo'];
const LABELS_EN = ['', 'Poor', 'So-so', 'Good', 'Very good', 'Excellent'];

export function AnonymousFeedbackForm() {
  const lang = useLang();
  const labels = lang === 'en' ? LABELS_EN : LABELS;
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState('');
  const [visit, setVisit] = useState('');
  const [hp, setHp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!rating) {
      setError(L(lang, 'Scegli un voto da 1 a 5.', 'Please choose a rating from 1 to 5.'));
      return;
    }
    start(async () => {
      const res = await submitFeedbackAction({ rating, message, visit, website: hp });
      if (res.ok) setDone(true);
      else setError(feedbackErrorText(lang, res.error));
    });
  }

  if (done) {
    return (
      <div className="cp-done" role="status">
        <h2>{L(lang, 'Grazie, lo leggiamo davvero.', 'Thank you, we really do read it.')}</h2>
        <p>{L(lang, 'Il tuo feedback è arrivato in modo anonimo al salone.', 'Your feedback has reached the barbershop anonymously.')}</p>
        <p className="mt-4">
          {L(lang, 'Ti va di lasciare anche una recensione pubblica? Aiuta chi ci sceglie per la prima volta.', 'Would you also like to leave a public review? It helps people choosing us for the first time.')}
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <a href={SITE_CONFIG.googleReviewUrl} target="_blank" rel="noopener noreferrer" className="btn-primary inline-flex">
            {L(lang, 'Recensisci su Google', 'Review us on Google')}
          </a>
          <Link href="/recensioni/nuova" className="cp-ghost">
            {L(lang, 'Oppure sul sito', 'Or on our website')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="cp-form" noValidate>
      <div className="cp-field">
        <span id="fb-rating" className="mb-2 block text-sm font-semibold text-white/80">
          {L(lang, 'Com’è andata oggi?', 'How did it go today?')}
        </span>
        <div className="cp-stars" role="radiogroup" aria-labelledby="fb-rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={L(lang, `${n} su 5: ${labels[n]}`, `${n} out of 5: ${labels[n]}`)}
              className={`cp-star ${n <= rating ? 'is-on' : ''}`}
              onClick={() => setRating(n)}
            >
              <Star size={22} fill={n <= rating ? 'currentColor' : 'none'} aria-hidden />
            </button>
          ))}
        </div>
        <p className="cp-hint">{rating ? labels[rating] : L(lang, 'Tocca una stella', 'Tap a star')}</p>
      </div>
      <div className="cp-field">
        <label htmlFor="fb-visit">{L(lang, 'Che servizio hai fatto? (facoltativo)', 'Which service did you have? (optional)')}</label>
        <select id="fb-visit" value={visit} onChange={(e) => setVisit(e.target.value)}>
          <option value="">{L(lang, 'Preferisco non dirlo', 'I’d rather not say')}</option>
          {/* Il valore inviato resta sempre in italiano (stesso dato nel salone); cambia solo l'etichetta. */}
          <option value="Taglio">{L(lang, 'Taglio', 'Haircut')}</option>
          <option value="Taglio e barba">{L(lang, 'Taglio e barba', 'Haircut and beard')}</option>
          <option value="Barba">{L(lang, 'Barba', 'Beard')}</option>
          <option value="Taglio bambino">{L(lang, 'Taglio bambino', 'Kids’ haircut')}</option>
          <option value="Piega">{L(lang, 'Piega', 'Styling')}</option>
        </select>
      </div>
      <div className="cp-field">
        <label htmlFor="fb-msg">{L(lang, 'Cosa possiamo migliorare? (facoltativo)', 'What can we improve? (optional)')}</label>
        <textarea id="fb-msg" value={message} maxLength={1500} onChange={(e) => setMessage(e.target.value)} placeholder={L(lang, 'Scrivi liberamente. Non chiediamo nome né contatti.', 'Write freely. We don’t ask for your name or contact details.')} />
      </div>
      <div className="cp-hp" aria-hidden>
        <label htmlFor="fb-website">{L(lang, 'Sito web', 'Website')}</label>
        <input id="fb-website" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} />
      </div>
      {error && <p className="cp-error" role="alert">{error}</p>}
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? L(lang, 'Invio…', 'Sending…') : L(lang, 'Invia in modo anonimo', 'Send anonymously')}
      </button>
    </form>
  );
}
