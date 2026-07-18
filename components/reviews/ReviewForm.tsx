'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Star, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createReview } from '@/lib/actions/reviews';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ReviewFormProps {
  defaultName?: string;
}

export function ReviewForm({ defaultName = '' }: ReviewFormProps) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState(defaultName);
  const [comment, setComment] = useState('');
  const [authorizedByCustomer, setAuthorizedByCustomer] = useState(true);
  const [pending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);

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
        toast.error(res.error || 'Errore durante l\'invio.');
      }
    });
  };

  if (success) {
    return (
      <div className="text-center py-12 px-4 space-y-6 max-w-md mx-auto">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 mx-auto animate-bounce">
          <CheckCircle className="h-10 w-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-display uppercase tracking-wide text-gold font-bold">
            Grazie mille!
          </h2>
          <p className="text-sm text-white/70">
            La tua recensione è stata inviata. Apprezziamo molto il tuo tempo e il tuo supporto per Garofalo Barberia.
          </p>
          {authorizedByCustomer && (
            <p className="text-xs text-gold/80 italic mt-2">
              ✓ Avendo concesso l'autorizzazione, la tua recensione è ora visibile sul nostro sito!
            </p>
          )}
        </div>
        <div className="pt-4 flex flex-col gap-3">
          <Button onClick={() => router.push('/')} className="w-full bg-gold hover:bg-gold-light text-black font-semibold rounded-full py-6">
            Torna alla Home
          </Button>
          <Button onClick={() => router.push('/prenota')} variant="outline" className="w-full border-white/10 text-white rounded-full py-6">
            Prenota un appuntamento
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg mx-auto bg-white/[0.02] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-gold to-transparent" />
      
      <div className="space-y-1 text-center">
        <h2 className="font-display text-xl uppercase tracking-wider text-gold">La tua recensione</h2>
        <p className="text-xs text-white/50">Aiutaci a crescere e condividi la tua opinione con gli altri clienti</p>
      </div>

      {/* Star Selector */}
      <div className="flex flex-col items-center justify-center space-y-2">
        <Label className="text-xs text-white/60">Valutazione</Label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => {
            const active = hoverRating !== null ? star <= hoverRating : star <= rating;
            return (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(null)}
                className="transition-transform active:scale-90 p-1"
                aria-label={`Valuta ${star} stelle`}
              >
                <Star
                  className={`h-8 w-8 transition-colors ${
                    active ? 'fill-gold text-gold' : 'text-white/20'
                  }`}
                />
              </button>
            );
          })}
        </div>
        <span className="text-xs font-semibold text-gold tracking-widest mt-1">
          {rating === 5 ? 'ECCELLENTE' : rating === 4 ? 'MOLTO BUONO' : rating === 3 ? 'BUONO' : rating === 2 ? 'SUFFICIENTE' : 'INSUFFICIENTE'}
        </span>
      </div>

      {/* Name Input */}
      <div>
        <Label htmlFor="review-name" className="text-xs text-white/70">Il tuo nome (visibile al pubblico) *</Label>
        <Input
          id="review-name"
          type="text"
          placeholder="Es. Mario Rossi"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          required
          className="mt-1 bg-black/40 border-white/10 text-white placeholder-white/30 focus:border-gold/50 rounded-lg py-5"
        />
      </div>

      {/* Comment Input */}
      <div>
        <Label htmlFor="review-comment" className="text-xs text-white/70">Cosa ne pensi del nostro servizio? *</Label>
        <textarea
          id="review-comment"
          placeholder="Scrivi qui la tua recensione..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          required
          rows={4}
          className="mt-1 flex w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-gold/50 focus:outline-none focus:ring-0 admin-modal-scroll resize-y overflow-y-auto"
        />
      </div>

      {/* Authorization Checkbox */}
      <div className="rounded-xl border border-gold/20 bg-gold/5 p-4 space-y-3">
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={authorizedByCustomer}
            onChange={(e) => setAuthorizedByCustomer(e.target.checked)}
            className="rounded border-white/20 bg-black text-gold focus:ring-0 focus:ring-offset-0 h-5 w-5 shrink-0 mt-0.5"
          />
          <div className="space-y-1">
            <span className="text-sm font-semibold text-white">Autorizzo la pubblicazione sul sito</span>
            <p className="text-xs text-white/50 leading-relaxed">
              Spuntando questa casella, autorizzi la pubblicazione del tuo nome e della tua recensione direttamente sulla homepage del sito di Garofalo Barberia.
            </p>
          </div>
        </label>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={pending}
        className="w-full bg-gold hover:bg-gold-light text-black py-6 font-bold rounded-full transition-all duration-300 shadow-lg border-none"
      >
        {pending ? (
          <div className="flex items-center justify-center gap-2">
            <Loader2 size={18} className="animate-spin" />
            <span>Invio in corso...</span>
          </div>
        ) : (
          'Invia recensione'
        )}
      </Button>
    </form>
  );
}
