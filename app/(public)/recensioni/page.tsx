import Link from 'next/link';
import { Star, ArrowLeft, MessageSquare } from 'lucide-react';
import { getApprovedReviews } from '@/lib/actions/reviews';

import { AnimatedDivider } from '@/components/home/AnimatedDivider';

export const metadata = { title: 'Tutte le recensioni · Garofalo Barberia' };
export const dynamic = 'force-dynamic';

export default async function TutteLeRecensioniPage() {
  const dbReviews = await getApprovedReviews();
  
  const formattedDbReviews = dbReviews.map((r) => ({
    text: r.comment,
    author: r.customer_name,
    rating: r.rating,
    date: r.created_at ? new Date(r.created_at).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }) : null
  }));

  const allReviews = formattedDbReviews;

  return (
    <section className="pt-10 pb-16 min-h-[85vh] bg-black text-white">
      <div className="container-lux max-w-6xl px-4 mx-auto">
        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
          <div className="space-y-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gold hover:text-gold-light transition-colors"
            >
              <ArrowLeft size={14} /> Torna alla Home
            </Link>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl uppercase tracking-wide">
              Le Voci dei Clienti
            </h1>
            <p className="text-white/60 text-sm max-w-xl">
              Cosa dice chi ha provato i nostri tagli, la cura della barba e l'esperienza in salone.
            </p>
          </div>
          
          <Link
            href="/recensioni/nuova"
            className="btn-primary inline-flex items-center gap-2 self-start md:self-center"
          >
            <MessageSquare size={16} /> Lascia una recensione
          </Link>
        </div>

        <div className="mb-6">
          <AnimatedDivider />
        </div>

        {/* Reviews Grid */}
        {allReviews.length === 0 ? (
          <div className="text-center py-16 border border-white/10 rounded-2xl bg-white/[0.01]">
            <p className="text-white/50 text-sm">Non ci sono ancora recensioni da mostrare.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allReviews.map((review, idx) => (
              <div
                key={`${review.author}-${idx}`}
                className="review-card-shine flex flex-col justify-between p-6 sm:p-8 rounded-2xl border border-white/10 bg-white/[0.02] shadow-xl hover:shadow-[0_4px_22px_rgba(205,154,79,0.55)] hover:border-gold hover:bg-gradient-to-br hover:from-[#cd9a4f] hover:to-[#8f6520] transition-all duration-300 relative group overflow-hidden hover:-translate-y-0.5 cursor-default"
              >
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-gold/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className="space-y-4">
                  {/* Stars */}
                  <div className="flex text-gold">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={16}
                        className={i < (review.rating || 5) ? 'fill-gold text-gold group-hover:fill-black group-hover:text-black transition-colors duration-300' : 'text-white/20 group-hover:text-black/25 transition-colors duration-300'}
                      />
                    ))}
                  </div>

                  {/* Comment */}
                  <p className="text-white/80 text-sm sm:text-base leading-relaxed italic group-hover:text-black transition-colors duration-300">
                    &ldquo;{review.text}&rdquo;
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/5 group-hover:border-black/10 flex items-center justify-between transition-colors duration-300">
                  <span className="font-semibold text-xs text-gold uppercase tracking-wider group-hover:text-black/85 transition-colors duration-300">
                    {review.author}
                  </span>
                  {review.date && (
                    <span className="text-[10px] text-white/40 uppercase tracking-widest group-hover:text-black/60 transition-colors duration-300">
                      {review.date}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
