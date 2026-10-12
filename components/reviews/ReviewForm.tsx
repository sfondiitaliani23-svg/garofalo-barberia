'use client';

import Image from 'next/image';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle, Loader2, ShieldCheck, Star } from 'lucide-react';
import { toast } from 'sonner';
import { createReview } from '@/lib/actions/reviews';
import './review-form.css';

interface ReviewFormProps {
  defaultName?: string;
}

const RATING_LABELS: Record<number, string> = {
  5: 'Eccellente',
  4: 'Molto buono',
  3: 'Buono',
  2: 'Sufficiente',
  1: 'Insufficiente',
};

export function ReviewForm({ defaultName = '' }: ReviewFormProps) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState(defaultName);
  const [comment, setComment] = useState('');
  const [authorizedByCustomer, setAuthorizedByCustomer] = useState(true);
  const [pending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);

  const shownRating = hoverRating ?? rating;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      toast.error('Per favore, inserisci il tuo nome.');
      return;
    }

    if (!comment.trim()) {
      toast.error('Per favore, scrivi un commento sulla tua esperienza.');
      return;
    }

    startTransition(async () => {
      const res = await createReview({
        customerName: customerName.trim(),
        rating,
        comment: comment.trim(),
        authorizedByCustomer,
      });

      if (res.ok) {
        setSuccess(true);
        toast.success('Recensione inviata con successo!');
      } else {
        toast.error(res.error || "Errore durante l'invio.");
      }
    });
  };

  if (success) {
    return (
      <div className="rf-panel rf-success">
        <CheckCircle className="rf-success-icon" aria-hidden />
        <h2 className="rf-success-title">Grazie mille!</h2>
        <p className="rf-success-text">
          La tua recensione è stata inviata. Apprezziamo molto il tuo tempo e il tuo supporto per Garofalo Barberia.
        </p>
        {authorizedByCustomer && (
          <p className="rf-success-note">Hai dato l&apos;autorizzazione: la tua recensione è ora visibile sul sito.</p>
        )}
        <div className="rf-success-actions">
          <button type="button" className="rf-submit" onClick={() => router.push('/recensioni')}>
            Vedi le recensioni
            <ArrowRight size={15} aria-hidden />
          </button>
          <button type="button" className="rf-secondary" onClick={() => router.push('/prenota')}>
            Prenota un appuntamento
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rf-panel">
      <form onSubmit={handleSubmit} className="rf-form">
        <h2 className="rf-title">La tua recensione</h2>

        <fieldset className="rf-field">
          <legend className="rf-label">Valutazione</legend>
          <div className="rf-stars" onMouseLeave={() => setHoverRating(null)}>
            {[1, 2, 3, 4, 5].map((star) => {
              const active = star <= shownRating;
              return (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onFocus={() => setHoverRating(star)}
                  onBlur={() => setHoverRating(null)}
                  className="rf-star-btn"
                  aria-label={`Valuta ${star} ${star === 1 ? 'stella' : 'stelle'}`}
                  aria-pressed={star === rating}
                >
                  <Star className={active ? 'rf-star is-on' : 'rf-star'} aria-hidden />
                </button>
              );
            })}
            <span className="rf-rating-label">{RATING_LABELS[shownRating]}</span>
          </div>
        </fieldset>

        <div className="rf-field">
          <label htmlFor="review-name" className="rf-label">
            Il tuo nome (visibile al pubblico) *
          </label>
          <input
            id="review-name"
            type="text"
            placeholder="Es. Mario Rossi"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            required
            maxLength={80}
            autoComplete="name"
            className="rf-input"
          />
        </div>

        <div className="rf-field">
          <label htmlFor="review-comment" className="rf-label">
            Cosa ne pensi del nostro servizio? *
          </label>
          <textarea
            id="review-comment"
            placeholder="Scrivi qui la tua recensione..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            required
            rows={4}
            maxLength={1000}
            className="rf-input rf-textarea"
          />
        </div>

        <div className="rf-bottom">
          <label className="rf-check">
            <input
              type="checkbox"
              checked={authorizedByCustomer}
              onChange={(e) => setAuthorizedByCustomer(e.target.checked)}
            />
            <span>
              <strong>Autorizzo la pubblicazione sul sito</strong>
              <small>
                Spuntando questa casella, autorizzi la pubblicazione del tuo nome e della tua recensione direttamente
                sul sito di Garofalo Barberia.
              </small>
            </span>
          </label>

          <button type="submit" disabled={pending} className="rf-submit">
            {pending ? (
              <>
                <Loader2 size={16} className="animate-spin" aria-hidden />
                Invio in corso...
              </>
            ) : (
              <>
                Pubblica recensione
                <ArrowRight size={15} aria-hidden />
              </>
            )}
          </button>
        </div>
      </form>

      <aside className="rf-summary" aria-label="Riepilogo">
        <h2 className="rf-title">Riepilogo</h2>
        <div className="rf-summary-stars" aria-label={`${rating} stelle su 5`}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Star key={star} className={star <= rating ? 'rf-star is-on' : 'rf-star'} aria-hidden />
          ))}
        </div>
        <p className="rf-summary-text">
          {authorizedByCustomer
            ? 'La tua valutazione verrà mostrata pubblicamente insieme alla tua recensione.'
            : 'Senza autorizzazione la tua recensione resta privata: la legge solo lo staff della Barberia.'}
        </p>

        <div className="rf-divider" />

        <div className="rf-privacy">
          <ShieldCheck size={18} strokeWidth={1.6} aria-hidden />
          <div>
            <p className="rf-privacy-title">La tua privacy è al sicuro</p>
            <p className="rf-privacy-text">
              Salviamo solo nome, valutazione e testo. Il tuo nome è visibile solo se autorizzi la pubblicazione.
            </p>
          </div>
        </div>

        <div className="rf-signature">
          <Image
            src="/assets/sostituisci-immagini/icone/favicon.png"
            alt="Garofalo Barberia"
            width={96}
            height={96}
            className="rf-signature-logo"
          />
          <span className="rf-signature-line" aria-hidden />
        </div>
      </aside>
    </div>
  );
}
