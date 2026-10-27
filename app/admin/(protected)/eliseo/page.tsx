import { AdminEliseo } from '@/components/admin/AdminEliseo';
import { getEliseoAction } from '@/lib/actions/eliseo';
import { SITE_URL } from '@/lib/seo';

export const metadata = { title: 'Eliseo' };
export const dynamic = 'force-dynamic';

export default async function AdminEliseoPage() {
  const res = await getEliseoAction();
  return (
    <div>
      <h1 className="font-display text-3xl uppercase text-white">Eliseo</h1>
      <p className="mt-1 text-sm text-white/50">
        La rubrica dei clienti, fatta dagli appuntamenti. Le fasi si aggiornano da sole: chi ha prenotato, chi è nuovo, chi è da richiamare.
      </p>
      <div className="mt-6">
        {res.ok ? (
          <AdminEliseo contatti={res.contatti} tester={res.tester} modelli={res.modelli} prenotaUrl={`${SITE_URL}/prenota`} />
        ) : (
          <p className="border border-dashed border-gold/40 p-4 text-sm text-white/80">{res.error}</p>
        )}
      </div>
    </div>
  );
}
