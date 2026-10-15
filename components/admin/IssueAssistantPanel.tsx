'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Bot, Check, Loader2, Sparkles, X } from 'lucide-react';
import { analyzeIssue, applyProposal, dismissProposal } from '@/lib/actions/issue-assistant';
import type { IssueAnalysis } from '@/lib/issues/assistants';
import { cn } from '@/lib/utils';

const STATE_LABEL = { done: 'Fatto', failed: 'Non riuscito', dismissed: 'Scartata', pending: '' } as const;

export function IssueAssistantPanel({
  reportId,
  initial,
  readOnly,
}: {
  reportId: string;
  initial: IssueAnalysis | null | undefined;
  readOnly: boolean;
}) {
  const [analysis, setAnalysis] = useState<IssueAnalysis | null>(initial ?? null);
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  function ask() {
    startTransition(async () => {
      const r = await analyzeIssue(reportId);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setAnalysis(r.analysis);
    });
  }

  function approve(pid: string, label: string) {
    if (!window.confirm(`Confermi?\n\n${label}`)) return;
    setBusyId(pid);
    startTransition(async () => {
      const r = await applyProposal(reportId, pid);
      setBusyId(null);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setAnalysis(r.analysis);
      toast.success(r.message);
    });
  }

  function dismiss(pid: string) {
    startTransition(async () => {
      const r = await dismissProposal(reportId, pid);
      if (r.ok) setAnalysis(r.analysis);
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-gold">
          <Bot size={16} aria-hidden /> {analysis ? analysis.assistant : 'Assistente IA'}
          {analysis && <span className="text-[11px] font-normal text-white/40">({analysis.provider})</span>}
        </p>
        {!readOnly && (
          <button
            type="button"
            onClick={ask}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-full border border-gold/60 bg-gold/10 px-3 py-1 text-[11px] font-semibold text-gold transition hover:bg-gold/20 disabled:opacity-40"
          >
            {pending && !busyId ? <Loader2 size={12} className="animate-spin" aria-hidden /> : <Sparkles size={12} aria-hidden />}
            {analysis ? 'Analizza di nuovo' : 'Chiedi all\'assistente'}
          </button>
        )}
      </div>


      {analysis && (
        <div className="mt-2.5 space-y-2.5 text-[13px]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/45">Cosa non va</p>
            <p className="mt-0.5 text-white/85">{analysis.diagnosis}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/45">Cosa fare</p>
            <p className="mt-0.5 whitespace-pre-wrap text-white/85">{analysis.answer}</p>
          </div>
          {analysis.proposals.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-white/45">Soluzioni pronte (partono solo se approvi)</p>
              {analysis.proposals.map((p) => (
                <div key={p.id} className="rounded-lg border border-gold/20 bg-gold/[0.05] p-3">
                  <p className="font-semibold text-white">{p.label}</p>
                  {p.why && <p className="mt-0.5 text-xs text-white/55">{p.why}</p>}
                  {p.kind === 'note_for_developer' && <p className="mt-1 whitespace-pre-wrap rounded bg-white/5 p-2 text-xs text-white/70">{String(p.params.text)}</p>}
                  {p.state === 'pending' ? (
                    !readOnly && (
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => approve(p.id, p.label)}
                          disabled={pending}
                          className="inline-flex items-center gap-1 rounded-full bg-gold px-3 py-1 text-[11px] font-bold text-black transition hover:bg-gold-light disabled:opacity-40"
                        >
                          {busyId === p.id ? <Loader2 size={12} className="animate-spin" aria-hidden /> : <Check size={12} aria-hidden />}
                          Approva ed esegui
                        </button>
                        <button
                          type="button"
                          onClick={() => dismiss(p.id)}
                          disabled={pending}
                          className="inline-flex items-center gap-1 rounded-full border border-white/15 px-3 py-1 text-[11px] text-white/60 transition hover:text-white disabled:opacity-40"
                        >
                          <X size={12} aria-hidden /> Scarta
                        </button>
                      </div>
                    )
                  ) : (
                    <p className={cn('mt-1 text-xs font-semibold', p.state === 'done' ? 'text-emerald-300' : p.state === 'failed' ? 'text-red-300' : 'text-white/40')}>
                      {STATE_LABEL[p.state]}
                      {p.result ? ` — ${p.result}` : ''}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
          <p className="text-[10px] text-white/30">Controlla sempre prima di approvare. Il codice lo cambiano Eliseo e Claude.</p>
        </div>
      )}
    </div>
  );
}
