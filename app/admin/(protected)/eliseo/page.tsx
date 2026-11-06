import { AdminEliseo } from '@/components/admin/AdminEliseo';
import { getEliseoAction } from '@/lib/actions/eliseo';
import { SITE_URL } from '@/lib/seo';

export const metadata = { title: 'Eliseo · Contatti e campagne' };
export const dynamic = 'force-dynamic';

export default async function AdminEliseoPage() {
  const res = await getEliseoAction();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl font-extrabold text-white">Eliseo · Contatti e campagne</h1>
        <p className="mt-1 text-sm text-white/50">
          Contatti, fasi e campagne: il tuo CRM, dentro il sito.
        </p>
      </div>

      <div>
        {res.ok ? (
          <AdminEliseo
            initialContatti={res.contatti}
            initialModelli={res.modelli}
            initialCampagne={res.campagne}
            initialCasella={res.casella}
            team={res.team}
            tester={res.tester}
            prenotaUrl={`${SITE_URL}/prenota`}
          />
        ) : (
          <p className="border border-dashed border-gold/40 p-4 text-sm text-white/80">{res.error}</p>
        )}
      </div>
    </div>
  );
}
