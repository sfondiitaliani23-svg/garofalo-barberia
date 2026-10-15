import { getApprovedReviews, getReviewStats } from '@/lib/actions/reviews';
import { L, type Lang } from '@/lib/i18n';
import { ReviewsCarousel } from '@/components/reviews/ReviewsCarousel';

export default async function RecensioniView({ lang }: { lang: Lang }) {
  const [dbReviews, stats] = await Promise.all([getApprovedReviews(), getReviewStats()]);

  const reviews = dbReviews.map((r) => ({
    text: r.comment,
    author: r.customer_name,
    rating: r.rating,
    date: r.created_at
      ? new Date(r.created_at).toLocaleDateString(L(lang, 'it-IT', 'en-GB'), {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
          timeZone: 'Europe/Rome',
        })
      : null,
  }));

  return (
    <section className="pt-8 pb-16 bg-black text-white">
      <div className="container-lux max-w-6xl px-4 mx-auto">
        <h1 className="sr-only">{L(lang, 'Le voci dei clienti', 'What our clients say')}</h1>
        <ReviewsCarousel reviews={reviews} stats={stats} />
      </div>
    </section>
  );
}
