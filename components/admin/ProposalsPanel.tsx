'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createProposal, reviewProposal, type ProposalStatus, type SiteProposal } from '@/lib/actions/proposals';

const STATUS_LABEL: Record<ProposalStatus, string> = {
  nuova: 'Nuova',
  in_valutazione: 'In valutazione',
  accettata: 'Accettata',
  non_ora: 'Non ora',
};

const field = 'w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-gold';

function when(iso: string) {
  return new Date(iso).toLocaleString('it-IT', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' });
}

export function ProposalsPanel({
  proposals,
  mode,
}: {
  proposals: SiteProposal[];
  mode: 'propose' | 'review' | 'read';
}) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [pending, start] = useTransition();

  return (
    <div className="space-y-6">
      {mode === 'propose' && (
        <form
          className="space-y-3 rounded-xl border border-white/10 bg-[#0c0c0c] p-5"
          onSubmit={(event) => {
            event.preventDefault();
            setError('');
            start(async () => {
              const result = await createProposal({ title, description });
              if (!result.ok) {
                setError(result.error || 'Invio non riuscito.');
                return;
              }
              setTitle('');
              setDescription('');
              router.refresh();
            });
          }}
        >
          <h2 className="text-lg text-white">Proponi una novità</h2>
          <p className="text-sm text-white/55">
            Puoi guardare tutta l&apos;area riservata. Le modifiche le fanno gli admin: qui gli dici cosa vorresti cambiare sul sito o nel pannello.
          </p>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-white/50">Titolo</span>
            <input className={field} value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} required />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-white/50">Descrizione</span>
            <textarea className={`${field} min-h-32`} value={description} maxLength={4000} onChange={(event) => setDescription(event.target.value)} required />
          </label>
          {error && <p className="text-sm text-red-300">{error}</p>}
          <button type="submit" disabled={pending} className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black disabled:opacity-60">
            {pending ? 'Invio…' : 'Invia agli admin'}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {proposals.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-[#0c0c0c] px-5 py-8 text-sm text-white/50">Nessuna proposta.</p>
        ) : (
          proposals.map((proposal) => <ProposalCard key={proposal.id} proposal={proposal} canReview={mode === 'review'} />)
        )}
      </div>
    </div>
  );
}

function ProposalCard({ proposal, canReview }: { proposal: SiteProposal; canReview: boolean }) {
  const router = useRouter();
  const [status, setStatus] = useState<ProposalStatus>(proposal.status);
  const [reply, setReply] = useState(proposal.reply);
  const [error, setError] = useState('');
  const [pending, start] = useTransition();

  return (
    <article className="rounded-xl border border-white/10 bg-[#0c0c0c] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-white">{proposal.title}</h3>
          <p className="mt-1 text-xs text-white/45">
            {proposal.authorName} · {when(proposal.createdAt)}
          </p>
        </div>
        <span className="rounded-full border border-gold/30 bg-gold/10 px-2.5 py-0.5 text-[11px] font-semibold text-gold">
          {STATUS_LABEL[proposal.status]}
        </span>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm text-white/75">{proposal.description}</p>
      {proposal.reply && !canReview && (
        <p className="mt-3 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/70">
          <strong className="text-white">Risposta dell&apos;admin. </strong>
          {proposal.reply}
        </p>
      )}
      {canReview && (
        <form
          className="mt-4 space-y-3 border-t border-white/10 pt-4"
          onSubmit={(event) => {
            event.preventDefault();
            setError('');
            start(async () => {
              const result = await reviewProposal({ id: proposal.id, status, reply });
              if (!result.ok) {
                setError(result.error || 'Aggiornamento non riuscito.');
                return;
              }
              router.refresh();
            });
          }}
        >
          <label className="block max-w-xs">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-white/50">Stato</span>
            <select className={field} value={status} onChange={(event) => setStatus(event.target.value as ProposalStatus)}>
              {(Object.keys(STATUS_LABEL) as ProposalStatus[]).map((item) => (
                <option key={item} value={item}>
                  {STATUS_LABEL[item]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-white/50">Risposta</span>
            <textarea className={`${field} min-h-20`} value={reply} maxLength={2000} onChange={(event) => setReply(event.target.value)} />
          </label>
          {error && <p className="text-sm text-red-300">{error}</p>}
          <button type="submit" disabled={pending} className="rounded-lg border border-gold/40 px-4 py-2 text-sm font-semibold text-gold disabled:opacity-60">
            {pending ? 'Salvo…' : 'Salva risposta'}
          </button>
        </form>
      )}
    </article>
  );
}
