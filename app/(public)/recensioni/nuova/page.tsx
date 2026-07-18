import { ReviewForm } from '@/components/reviews/ReviewForm';
import { getProfile } from '@/lib/auth';

export const metadata = { title: 'Lascia una recensione · Garofalo Barberia' };
export const dynamic = 'force-dynamic';

export default async function NuovaRecensionePage() {
  const profile = await getProfile();

  return (
    <section className="py-16 min-h-[70vh] flex items-center justify-center">
      <div className="container-lux max-w-lg">
        <div className="mb-8 text-center space-y-2">
          <h1 className="font-display text-3xl sm:text-4xl uppercase tracking-wide">Lascia una recensione</h1>
          <p className="text-white/60 text-sm">Raccontaci la tua esperienza da Garofalo Barberia</p>
        </div>
        
        <ReviewForm defaultName={profile?.full_name ?? ''} />
      </div>
    </section>
  );
}
