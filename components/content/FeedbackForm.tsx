'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Star } from 'lucide-react';
import { submitFeedbackAction } from '@/lib/actions/site-inbox';

const LABELS = ['', 'Male', 'Così così', 'Bene', 'Molto bene', 'Benissimo'];

export function FeedbackForm() {
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
      setError('Scegli un voto da 1 a 5.');
      return;
    }
    start(async () => {
      const res = await submitFeedbackAction({ rating, message, visit, website: hp });
      if (res.ok) setDone(true);
      else setError(res.error);
    });
  }

  if (done) {
    return (
      <div className="cp-done" role="status">
        <h2>Grazie, lo leggiamo davvero.</h2>
        <p>Il tuo feedback è arrivato in modo anonimo al salone.</p>
        <p className="mt-4">Ti va di lasciare anche una recensione pubblica? Aiuta chi ci sceglie per la prima volta.</p>
        <Link href="/recensioni/nuova" className="btn-primary mt-4 inline-flex">
          Scrivi una recensione
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="cp-form" noValidate>
      <div className="cp-field">
        <span id="fb-rating" className="mb-2 block text-sm font-semibold text-white/80">
          Com’è andata oggi?
        </span>
        <div className="cp-stars" role="radiogroup" aria-labelledby="fb-rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} su 5: ${LABELS[n]}`}
              className={`cp-star ${n <= rating ? 'is-on' : ''}`}
              onClick={() => setRating(n)}
            >
              <Star size={22} fill={n <= rating ? 'currentColor' : 'none'} aria-hidden />
            </button>
          ))}
        </div>
        <p className="cp-hint">{rating ? LABELS[rating] : 'Tocca una stella'}</p>
      </div>
      <div className="cp-field">
        <label htmlFor="fb-visit">Che servizio hai fatto? (facoltativo)</label>
        <select id="fb-visit" value={visit} onChange={(e) => setVisit(e.target.value)}>
          <option value="">Preferisco non dirlo</option>
          <option>Taglio</option>
          <option>Taglio e barba</option>
          <option>Barba</option>
          <option>Taglio bambino</option>
          <option>Piega</option>
        </select>
      </div>
      <div className="cp-field">
        <label htmlFor="fb-msg">Cosa possiamo migliorare? (facoltativo)</label>
        <textarea id="fb-msg" value={message} maxLength={1500} onChange={(e) => setMessage(e.target.value)} placeholder="Scrivi liberamente. Non chiediamo nome né contatti." />
      </div>
      <div className="cp-hp" aria-hidden>
        <label htmlFor="fb-website">Sito web</label>
        <input id="fb-website" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} />
      </div>
      {error && <p className="cp-error" role="alert">{error}</p>}
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? 'Invio…' : 'Invia in modo anonimo'}
      </button>
    </form>
  );
}
