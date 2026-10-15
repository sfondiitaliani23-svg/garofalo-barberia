import { ReviewForm } from '@/components/reviews/ReviewForm';
import { getProfile } from '@/lib/auth';
import { L, type Lang } from '@/lib/i18n';

export default async function NuovaRecensioneView({ lang }: { lang: Lang }) {
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

        <ReviewForm defaultName={profile?.full_name ?? ''} />
      </div>
    </section>
  );
}
