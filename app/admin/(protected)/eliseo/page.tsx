import { AdminEliseo } from '@/components/admin/AdminEliseo';
import { getEliseoAction } from '@/lib/actions/eliseo';
import { SITE_URL } from '@/lib/seo';

export const metadata = { title: 'Eliseo • Contatti, Addestramento e Automazioni' };
export const dynamic = 'force-dynamic';

export default async function AdminEliseoPage() {
  const res = await getEliseoAction();
  return (
    <div className="w-full h-full flex flex-col">
      {res.ok ? (
        <AdminEliseo
          initialContatti={res.contatti}
          initialModelli={res.modelli}
          initialCampagne={res.campagne}
          initialCasella={res.casella}
          initialFaq={res.faq}
          initialDocumenti={res.documenti}
          initialAssistente={res.assistente}
          initialVersioniPrompt={res.versioniPrompt}
          initialAutomazioni={res.automazioni}
          team={res.team}
          tester={res.tester}
          prenotaUrl={`${SITE_URL}/prenota`}
        />
      ) : (
        <p className="border border-dashed border-gold/40 p-4 text-sm text-white/80">{res.error}</p>
      )}
    </div>
  );
}
