'use client';

import { useState, useTransition } from 'react';
import { CheckCircle2, ExternalLink, KeyRound, Loader2, Sparkles, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { AiSettingsView } from '@/lib/utils/ai-settings';

type Provider = 'gemini' | 'groq';

const PROVIDERS: { id: Provider; name: string; role: string; url: string; steps: string[] }[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    role: 'Prima scelta',
    url: 'https://aistudio.google.com/apikey',
    steps: ['Apri il link e accedi con un account Google.', 'Tocca "Create API key" (crea chiave).', 'Copia la chiave e incollala qui sotto.'],
  },
  {
    id: 'groq',
    name: 'Groq',
    role: 'Riserva',
    url: 'https://console.groq.com/keys',
    steps: ['Apri il link e registrati (anche con Google).', 'Tocca "Create API Key".', 'Copia la chiave e incollala qui sotto.'],
  },
];

export function AdminAiSettings({ initial }: { initial: AiSettingsView }) {
  const [view, setView] = useState(initial);
  const [keys, setKeys] = useState<Record<Provider, string>>({ gemini: '', groq: '' });
  const [tests, setTests] = useState<Record<Provider, { ok: boolean; msg: string } | null>>({ gemini: null, groq: null });
  const [busy, setBusy] = useState<string | null>(null);
  const [, start] = useTransition();

  const reload = async () => {
    const { getAiSettingsAction } = await import('@/lib/actions/ai-admin');
    setView(await getAiSettingsAction());
  };

  const save = (opts: { enabled?: boolean; remove?: Provider[] } = {}) => {
    setBusy('save');
    start(async () => {
      const { saveAiSettingsAction } = await import('@/lib/actions/ai-admin');
      const r = await saveAiSettingsAction({
        enabled: opts.enabled ?? view.enabled,
        geminiKey: keys.gemini,
        groqKey: keys.groq,
        remove: opts.remove,
      });
      setBusy(null);
      if (!r.ok) {
        toast.error(r.error ?? 'Errore');
        return;
      }
      toast.success('Impostazioni salvate');
      setKeys({ gemini: '', groq: '' });
      await reload();
    });
  };

  const test = (p: Provider) => {
    setBusy(`test-${p}`);
    start(async () => {
      const { testAiAction } = await import('@/lib/actions/ai-admin');
      const r = await testAiAction(p, keys[p]);
      setBusy(null);
      setTests((t) => ({ ...t, [p]: r.ok ? { ok: true, msg: r.text ?? 'Funziona' } : { ok: false, msg: r.error ?? 'Errore' } }));
    });
  };

  const totals = view.days.reduce((a, d) => ({ ai: a.ai + d.gemini + d.groq, rules: a.rules + d.regole }), { ai: 0, rules: 0 });
  const active = view.enabled && (view.gemini || view.groq);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-white/10 bg-[#0e0e0e] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-gold/40 bg-gold/10 text-gold">
              <Sparkles size={20} />
            </span>
            <div>
              <p className="font-semibold text-white">Assistente della chat con AI gratuita</p>
              <p className="mt-1 max-w-xl text-sm text-white/60">
                La chat del sito risponde a qualsiasi domanda usando solo i dati veri del salone. Ordine: Gemini → Groq → risposte
                automatiche di sempre. Se un servizio è al limite, passa da solo al successivo: la chat non si blocca mai.
              </p>
            </div>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-3 text-sm text-white/80">
            <span>{view.enabled ? 'Attiva' : 'Spenta'}</span>
            <input
              type="checkbox"
              className="peer sr-only"
              checked={view.enabled}
              onChange={(e) => {
                setView((v) => ({ ...v, enabled: e.target.checked }));
                save({ enabled: e.target.checked });
              }}
            />
            <span className="relative h-6 w-11 rounded-full bg-white/15 transition peer-checked:bg-gold after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" />
          </label>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-white/10 bg-black/30 p-3">
            <p className="text-xs text-white/55">Stato</p>
            <p className={`mt-1 font-semibold ${active ? 'text-green-400' : 'text-amber-300'}`}>{active ? 'AI attiva' : 'Solo risposte automatiche'}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/30 p-3">
            <p className="text-xs text-white/55">Risposte AI · ultimi 7 giorni</p>
            <p className="mt-1 text-xl font-bold text-white">{totals.ai}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/30 p-3">
            <p className="text-xs text-white/55">Risposte automatiche · 7 giorni</p>
            <p className="mt-1 text-xl font-bold text-white">{totals.rules}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {PROVIDERS.map((p) => {
          const saved = view[p.id];
          const t = tests[p.id];
          return (
            <div key={p.id} className="rounded-xl border border-white/10 bg-[#0e0e0e] p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-white">{p.name}</p>
                <span className="rounded-full border border-gold/40 px-2 py-0.5 text-[11px] font-semibold text-gold">{p.role}</span>
              </div>
              <p className="mt-2 flex items-center gap-2 text-sm">
                <KeyRound size={14} className="text-white/50" />
                {saved ? (
                  <span className="text-white/80">
                    Chiave salvata: <code className="text-gold">{saved}</code>
                    {view.fromEnv[p.id] && !keys[p.id] ? ' (da Vercel)' : ''}
                  </span>
                ) : (
                  <span className="text-white/50">Nessuna chiave</span>
                )}
              </p>
              <ol className="mt-3 list-decimal space-y-1 pl-5 text-xs text-white/60">
                {p.steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
              <a href={p.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-gold hover:underline">
                Crea la chiave gratuita <ExternalLink size={12} />
              </a>
              <input
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={keys[p.id]}
                onChange={(e) => setKeys((k) => ({ ...k, [p.id]: e.target.value }))}
                placeholder={saved ? 'Incolla una nuova chiave per sostituirla' : 'Incolla qui la chiave'}
                className="mt-3 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/35"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => test(p.id)}
                  disabled={busy !== null || (!keys[p.id] && !saved)}
                  className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/20 px-4 text-sm text-white/85 hover:border-gold/60 disabled:opacity-40"
                >
                  {busy === `test-${p.id}` && <Loader2 size={14} className="animate-spin" />} Prova
                </button>
                {saved && !view.fromEnv[p.id] && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Togliere la chiave di ${p.name}?`)) save({ remove: [p.id] });
                    }}
                    disabled={busy !== null}
                    className="inline-flex min-h-9 items-center rounded-full px-3 text-sm text-red-400/80 hover:bg-red-500/10"
                  >
                    Togli chiave
                  </button>
                )}
              </div>
              {t && (
                <p className={`mt-3 flex items-start gap-2 text-sm ${t.ok ? 'text-green-400' : 'text-red-400'}`}>
                  {t.ok ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <XCircle size={16} className="mt-0.5 shrink-0" />}
                  <span>{t.ok ? `Funziona! Risposta di prova: “${t.msg}”` : t.msg}</span>
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-white/50">Le chiavi restano private: non sono mai mostrate per intero né inviate ai clienti.</p>
        <button
          type="button"
          onClick={() => save()}
          disabled={busy !== null || (!keys.gemini && !keys.groq)}
          className="inline-flex min-h-10 items-center gap-2 rounded-full bg-gold px-5 text-sm font-semibold text-black disabled:opacity-40"
        >
          {busy === 'save' && <Loader2 size={14} className="animate-spin" />} Salva chiavi
        </button>
      </div>
    </div>
  );
}
