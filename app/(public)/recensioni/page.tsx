import { getApprovedReviews, getReviewStats } from '@/lib/actions/reviews';
import { ReviewsCarousel } from '@/components/reviews/ReviewsCarousel';

export const metadata = {
  title: 'Recensioni dei clienti',
  description: "Le recensioni dei clienti della Barberia Garofalo a Foggia. Leggi le opinioni o lascia la tua.",
  alternates: { canonical: '/recensioni' },
};
export const revalidate = 60;

export default async function TutteLeRecensioniPage() {
  const [dbReviews, stats] = await Promise.all([getApprovedReviews(), getReviewStats()]);

  const reviews = dbReviews.map((r) => ({
    text: r.comment,
    author: r.customer_name,
    rating: r.rating,
    date: r.created_at
      ? new Date(r.created_at).toLocaleDateString('it-IT', {
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
        <h1 className="sr-only">Le voci dei clienti</h1>
        <ReviewsCarousel reviews={reviews} stats={stats} />
      </div>
    </section>
  );
}
