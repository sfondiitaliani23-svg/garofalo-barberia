import { ReviewForm } from '@/components/reviews/ReviewForm';
import { getProfile } from '@/lib/auth';
import { L, type Lang } from '@/lib/i18n';

/** Legge `?stelle=` dal link dell'email: solo numeri da 1 a 5, altrimenti 5. */
export function ratingFromParam(value: string | string[] | undefined) {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : 5;
}

export default async function NuovaRecensioneView({ lang, rating = 5 }: { lang: Lang; rating?: number }) {
  const profile = await getProfile();

  return (
    <section className="pt-10 pb-16 bg-black text-white">
      <div className="container-lux max-w-5xl px-4 mx-auto">
        <div className="mb-7 space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold">{L(lang, 'Il tuo parere conta', 'Your opinion matters')}</p>
          <h1 className="font-serif text-3xl sm:text-4xl" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
            {L(lang, 'Lascia una recensione', 'Leave a review')}
          </h1>
          <p className="text-white/60 text-sm">
            {L(lang, 'Raccontaci la tua esperienza da Garofalo Barberia.', 'Tell us about your experience at Garofalo Barberia.')}
          </p>
        </div>

        <ReviewForm defaultName={profile?.full_name ?? ''} defaultRating={rating} />
      </div>
    </section>
  );
}
