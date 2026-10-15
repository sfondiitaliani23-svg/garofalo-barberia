'use client';

import Image from 'next/image';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle, Loader2, ShieldCheck, Star } from 'lucide-react';
import { toast } from 'sonner';
import { createReview } from '@/lib/actions/reviews';
import { useLang } from '@/components/i18n/LangProvider';
import { L, localHref } from '@/lib/i18n';
import { reviewErrorText } from '@/lib/i18n/content-team';
import './review-form.css';

interface ReviewFormProps {
  defaultName?: string;
}

const RATING_LABELS_EN: Record<number, string> = {
  5: 'Excellent',
  4: 'Very good',
  3: 'Good',
  2: 'Fair',
  1: 'Poor',
};

const RATING_LABELS: Record<number, string> = {
  5: 'Eccellente',
  4: 'Molto buono',
  3: 'Buono',
  2: 'Sufficiente',
  1: 'Insufficiente',
};

export function ReviewForm({ defaultName = '' }: ReviewFormProps) {
  const router = useRouter();
  const lang = useLang();
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
      toast.error(L(lang, 'Per favore, inserisci il tuo nome.', 'Please enter your name.'));
      return;
    }

    if (!comment.trim()) {
      toast.error(L(lang, 'Per favore, scrivi un commento sulla tua esperienza.', 'Please write a comment about your experience.'));
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
        toast.success(L(lang, 'Recensione inviata con successo!', 'Review sent successfully!'));
      } else {
        toast.error(reviewErrorText(lang, res.error));
      }
    });
  };

  if (success) {
    return (
      <div className="rf-panel rf-success">
        <CheckCircle className="rf-success-icon" aria-hidden />
        <h2 className="rf-success-title">{L(lang, 'Grazie mille!', 'Thank you so much!')}</h2>
        <p className="rf-success-text">
          {L(
            lang,
            'La tua recensione è stata inviata. Apprezziamo molto il tuo tempo e il tuo supporto per Garofalo Barberia.',
            'Your review has been sent. We truly appreciate your time and your support for Garofalo Barberia.'
          )}
        </p>
        {authorizedByCustomer && (
          <p className="rf-success-note">
            {lang === 'en' ? 'You gave your permission: your review is now visible on the website.' : <>Hai dato l&apos;autorizzazione: la tua recensione è ora visibile sul sito.</>}
          </p>
        )}
        <div className="rf-success-actions">
          <button type="button" className="rf-submit" onClick={() => router.push(localHref(lang, '/recensioni'))}>
            {L(lang, 'Vedi le recensioni', 'See the reviews')}
            <ArrowRight size={15} aria-hidden />
          </button>
          <button type="button" className="rf-secondary" onClick={() => router.push(localHref(lang, '/prenota'))}>
            {L(lang, 'Prenota un appuntamento', 'Book an appointment')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rf-panel">
      <form onSubmit={handleSubmit} className="rf-form">
        <h2 className="rf-title">{L(lang, 'La tua recensione', 'Your review')}</h2>

        <fieldset className="rf-field">
          <legend className="rf-label">{L(lang, 'Valutazione', 'Rating')}</legend>
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
                  aria-label={L(lang, `Valuta ${star} ${star === 1 ? 'stella' : 'stelle'}`, `Rate ${star} ${star === 1 ? 'star' : 'stars'}`)}
                  aria-pressed={star === rating}
                >
                  <Star className={active ? 'rf-star is-on' : 'rf-star'} aria-hidden />
                </button>
              );
            })}
            <span className="rf-rating-label">{(lang === 'en' ? RATING_LABELS_EN : RATING_LABELS)[shownRating]}</span>
          </div>
        </fieldset>

        <div className="rf-field">
          <label htmlFor="review-name" className="rf-label">
            {L(lang, 'Il tuo nome (visibile al pubblico) *', 'Your name (visible to the public) *')}
          </label>
          <input
            id="review-name"
            type="text"
            placeholder={L(lang, 'Es. Mario Rossi', 'e.g. Mario Rossi')}
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
            {L(lang, 'Cosa ne pensi del nostro servizio? *', 'What do you think of our service? *')}
          </label>
          <textarea
            id="review-comment"
            placeholder={L(lang, 'Scrivi qui la tua recensione...', 'Write your review here...')}
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
              <strong>{L(lang, 'Autorizzo la pubblicazione sul sito', 'I allow publication on the website')}</strong>
              <small>
                {L(
                  lang,
                  'Spuntando questa casella, autorizzi la pubblicazione del tuo nome e della tua recensione direttamente sul sito di Garofalo Barberia.',
                  'By ticking this box, you allow your name and your review to be published directly on the Garofalo Barberia website.'
                )}
              </small>
            </span>
          </label>

          <button type="submit" disabled={pending} className="rf-submit">
            {pending ? (
              <>
                <Loader2 size={16} className="animate-spin" aria-hidden />
                {L(lang, 'Invio in corso...', 'Sending...')}
              </>
            ) : (
              <>
                {L(lang, 'Pubblica recensione', 'Publish review')}
                <ArrowRight size={15} aria-hidden />
              </>
            )}
          </button>
        </div>
      </form>

      <aside className="rf-summary" aria-label={L(lang, 'Riepilogo', 'Summary')}>
        <h2 className="rf-title">{L(lang, 'Riepilogo', 'Summary')}</h2>
        <div className="rf-summary-stars" aria-label={L(lang, `${rating} stelle su 5`, `${rating} out of 5 stars`)}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Star key={star} className={star <= rating ? 'rf-star is-on' : 'rf-star'} aria-hidden />
          ))}
        </div>
        <p className="rf-summary-text">
          {authorizedByCustomer
            ? L(lang, 'La tua valutazione verrà mostrata pubblicamente insieme alla tua recensione.', 'Your rating will be shown publicly together with your review.')
            : L(lang, 'Senza autorizzazione la tua recensione resta privata: la legge solo lo staff della Barberia.', 'Without permission your review stays private: only the barbershop staff will read it.')}
        </p>

        <div className="rf-divider" />

        <div className="rf-privacy">
          <ShieldCheck size={18} strokeWidth={1.6} aria-hidden />
          <div>
            <p className="rf-privacy-title">{L(lang, 'La tua privacy è al sicuro', 'Your privacy is safe')}</p>
            <p className="rf-privacy-text">
              {L(
                lang,
                'Salviamo solo nome, valutazione e testo. Il tuo nome è visibile solo se autorizzi la pubblicazione.',
                'We only save your name, rating and text. Your name is visible only if you allow publication.'
              )}
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
