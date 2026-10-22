import { ProposalsPanel } from '@/components/admin/ProposalsPanel';
import { getProfile } from '@/lib/auth';
import { listProposals } from '@/lib/actions/proposals';

export const metadata = { title: 'Proposte' };

export default async function AdminPropostePage() {
  const [proposals, me] = await Promise.all([listProposals(), getProfile()]);
  const mode = me?.role === 'tester' ? 'propose' : me?.role === 'admin' ? 'review' : 'read';

  return (
    <div>
      <h1 className="text-3xl text-white" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
        Proposte
      </h1>
      <p className="mt-1 text-sm text-white/50">
        {mode === 'propose'
          ? 'Le tue idee per il sito e per l’area riservata. Gli admin decidono se realizzarle.'
          : mode === 'review'
            ? 'Novità proposte dai tester. Puoi valutarle e rispondere.'
            : 'Novità proposte dai tester. Le valuta un admin.'}
      </p>
      <div className="mt-6">
        <ProposalsPanel proposals={proposals} mode={mode} />
      </div>
    </div>
  );
}
