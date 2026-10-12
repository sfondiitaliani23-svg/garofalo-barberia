import { ReviewForm } from '@/components/reviews/ReviewForm';
import { getProfile } from '@/lib/auth';

export const metadata = { title: 'Lascia una recensione · Garofalo Barberia' };
export const dynamic = 'force-dynamic';

export default async function NuovaRecensionePage() {
  const profile = await getProfile();

  return (
    <section className="pt-10 pb-16 bg-black text-white">
      <div className="container-lux max-w-5xl px-4 mx-auto">
        <div className="mb-7 space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold">Il tuo parere conta</p>
          <h1 className="font-serif text-3xl sm:text-4xl" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
            Lascia una recensione
          </h1>
          <p className="text-white/60 text-sm">Raccontaci la tua esperienza da Garofalo Barberia.</p>
        </div>

        <ReviewForm defaultName={profile?.full_name ?? ''} />
      </div>
    </section>
  );
}
