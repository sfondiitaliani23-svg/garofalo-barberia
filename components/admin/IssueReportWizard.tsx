'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  Database,
  Monitor,
  Scissors,
  Trash2,
  UserCog,
  Users,
} from 'lucide-react';
import { createIssueReport, deleteIssueReport, updateReportStatus } from '@/lib/actions/issue-reports';
import { SITE_AREAS, type IssueReport } from '@/lib/data/site-areas';
import { IssueAssistantPanel } from '@/components/admin/IssueAssistantPanel';
import { cn } from '@/lib/utils';

type Priority = IssueReport['priority'];

/** Le 10 aree del sito raccolte in 6 categorie semplici. */
const CATEGORIES = [
  { id: 'tecnico', title: 'Problemi tecnici', desc: 'Errori del sito, grafica, accessi e login', icon: Monitor, areas: ['design_ui', 'autenticazione'] },
  { id: 'prenotazioni', title: 'Prenotazioni', desc: 'Orari, slot, conferme e appuntamenti', icon: CalendarDays, areas: ['prenotazioni'] },
  { id: 'servizi', title: 'Servizi e promozioni', desc: 'Listino, prezzi, sconti e codici', icon: Scissors, areas: ['servizi', 'promozioni'] },
  { id: 'personale', title: 'Personale', desc: 'Barbieri, turni, ferie e disponibilità', icon: UserCog, areas: ['staff'] },
  { id: 'clienti', title: 'Clienti', desc: 'Lista clienti, galleria e area cliente', icon: Users, areas: ['clienti', 'area_cliente'] },
  { id: 'dati', title: 'Dati e magazzino', desc: 'Inventario prodotti, analytics e report', icon: Database, areas: ['inventario', 'analytics'] },
] as const;

const PRIORITIES: { id: Priority; label: string; cls: string }[] = [
  { id: 'bassa', label: 'Bassa', cls: 'border-sky-500/40 text-sky-300' },
  { id: 'media', label: 'Media', cls: 'border-gold/60 text-gold' },
  { id: 'alta', label: 'Alta', cls: 'border-orange-500/50 text-orange-300' },
  { id: 'critica', label: 'Critica', cls: 'border-red-500/50 text-red-300' },
];

/** Stati mostrati con onestà: nessuna risoluzione automatica. */
const STATUS: Record<IssueReport['status'], { label: string; cls: string }> = {
  in_analisi: { label: 'Aperta', cls: 'border-sky-500/30 bg-sky-500/10 text-sky-300' },
  manuale_richiesto: { label: 'Aperta', cls: 'border-sky-500/30 bg-sky-500/10 text-sky-300' },
  risolto_ia: { label: 'Da verificare', cls: 'border-amber-500/30 bg-amber-500/10 text-amber-300' },
  risolto_manuale: { label: 'Risolta', cls: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' },
  chiuso: { label: 'Chiusa', cls: 'border-white/15 bg-white/5 text-white/55' },
};

const STEPS = ['Categoria', 'Dettagli', 'Conferma'];

function areaName(id: string) {
  return SITE_AREAS.find((a) => a.id === id)?.name ?? id;
}

export function IssueReportWizard({ initialReports, readOnly = false }: { initialReports: IssueReport[]; readOnly?: boolean }) {
  const [reports, setReports] = useState(initialReports);
  const [step, setStep] = useState(0);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [areaId, setAreaId] = useState('');
  const [priority, setPriority] = useState<Priority>('media');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [technical, setTechnical] = useState('');
  const [pending, startTransition] = useTransition();

  const category = CATEGORIES.find((c) => c.id === categoryId) ?? null;

  function chooseCategory(id: string) {
    const c = CATEGORIES.find((x) => x.id === id)!;
    setCategoryId(id);
    setAreaId(c.areas[0]);
  }

  const canNext = step === 0 ? !!category : step === 1 ? title.trim().length > 2 && description.trim().length > 5 : true;

  function next() {
    if (!canNext) {
      toast.error(step === 0 ? 'Scegli una categoria.' : 'Scrivi un titolo e una descrizione.');
      return;
    }
    if (step < 2) setStep(step + 1);
    else submit();
  }

  function reset() {
    setStep(0);
    setCategoryId(null);
    setAreaId('');
    setPriority('media');
    setTitle('');
    setDescription('');
    setTechnical('');
  }

  function submit() {
    startTransition(async () => {
      const res = await createIssueReport({
        areaId,
        title: title.trim(),
        description: description.trim(),
        priority,
        technicalDetails: technical.trim() || undefined,
      });
      if (!res.ok || !res.report) {
        toast.error(res.error ?? 'Invio non riuscito. Riprova.');
        return;
      }
      setReports((r) => [res.report!, ...r]);
      toast.success('Segnalazione inviata. La trovi qui sotto come "Aperta".');
      reset();
    });
  }

  function setStatus(r: IssueReport, status: IssueReport['status']) {
    startTransition(async () => {
      const res = await updateReportStatus(r.id, status);
      if (!res.ok) {
        toast.error(res.error ?? 'Errore');
        return;
      }
      setReports((list) => list.map((x) => (x.id === r.id ? { ...x, status } : x)));
    });
  }

  function remove(r: IssueReport) {
    if (!window.confirm(`Eliminare la segnalazione "${r.title}"?`)) return;
    startTransition(async () => {
      const res = await deleteIssueReport(r.id);
      if (!res.ok) {
        toast.error(res.error ?? 'Errore');
        return;
      }
      setReports((list) => list.filter((x) => x.id !== r.id));
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl text-white" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
          Segnalaci il problema
        </h1>
        <p className="mt-1 text-sm text-white/50">
          Descrivi cosa non va o cosa vorresti cambiare. La segnalazione viene salvata e gestita dallo sviluppatore.
        </p>
      </div>

      {/* Modulo guidato */}
      <div className="grid overflow-hidden rounded-xl border border-white/10 bg-[#0c0c0c] lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="p-6">
          {/* Passi */}
          <ol className="flex items-center gap-2" aria-label="Passaggi">
            {STEPS.map((label, i) => (
              <li key={label} className="flex flex-1 items-center gap-2 last:flex-none">
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold',
                    i < step ? 'border-gold bg-gold/20 text-gold' : i === step ? 'border-gold bg-gold text-black' : 'border-white/20 text-white/45'
                  )}
                  aria-current={i === step ? 'step' : undefined}
                >
                  {i < step ? <Check size={13} /> : i + 1}
                </span>
                <span className={cn('text-sm', i === step ? 'font-semibold text-gold' : 'text-white/50')}>{label}</span>
                {i < STEPS.length - 1 && <span className="mx-1 h-px flex-1 bg-white/10" aria-hidden />}
              </li>
            ))}
          </ol>

          {step === 0 && (
            <div className="mt-6">
              <h2 className="text-xl text-white" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                1. Seleziona la categoria
              </h2>
              <p className="mt-1 text-sm text-white/50">Scegli quella che descrive meglio il problema.</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {CATEGORIES.map((c) => {
                  const Icon = c.icon;
                  const active = categoryId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => chooseCategory(c.id)}
                      onDoubleClick={() => {
                        chooseCategory(c.id);
                        setStep(1);
                      }}
                      aria-pressed={active}
                      className={cn(
                        'flex items-center gap-3 rounded-lg border p-4 text-left transition',
                        active ? 'border-gold bg-gold/10' : 'border-white/10 bg-[#111] hover:border-white/25'
                      )}
                    >
                      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', active ? 'bg-gold text-black' : 'bg-gold/10 text-gold')}>
                        <Icon size={18} aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-white">{c.title}</span>
                        <span className="block text-xs text-white/50">{c.desc}</span>
                      </span>
                      <ChevronRight size={16} className="text-white/35" aria-hidden />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 1 && category && (
            <div className="mt-6 space-y-5">
              <h2 className="text-xl text-white" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                2. Descrivi il problema
              </h2>
              {category.areas.length > 1 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">Area precisa</p>
                  <div className="flex flex-wrap gap-2">
                    {category.areas.map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => setAreaId(a)}
                        aria-pressed={areaId === a}
                        className={cn('rounded-full border px-3 py-1.5 text-xs font-semibold', areaId === a ? 'border-gold bg-gold/15 text-gold' : 'border-white/15 text-white/60')}
                      >
                        {areaName(a)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">Urgenza</p>
                <div className="grid grid-cols-4 gap-2">
                  {PRIORITIES.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPriority(p.id)}
                      aria-pressed={priority === p.id}
                      className={cn('rounded-lg border py-2 text-xs font-bold uppercase tracking-wider transition', priority === p.id ? cn(p.cls, 'bg-white/5') : 'border-white/10 text-white/35 hover:text-white/60')}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/50">Titolo *</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={120}
                  placeholder="Es. Lo sconto non viene applicato al sabato"
                  className="w-full rounded-lg border border-white/12 bg-[#111] px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-gold/60 focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/50">Descrizione *</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  maxLength={2000}
                  placeholder="Cosa succede, dove, e cosa ti aspettavi invece..."
                  className="w-full resize-y rounded-lg border border-white/12 bg-[#111] px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-gold/60 focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/50">Messaggio di errore o link (facoltativo)</span>
                <input
                  value={technical}
                  onChange={(e) => setTechnical(e.target.value)}
                  maxLength={500}
                  placeholder="Es. il testo dell'errore o l'indirizzo della pagina"
                  className="w-full rounded-lg border border-white/12 bg-[#111] px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-gold/60 focus:outline-none"
                />
              </label>
            </div>
          )}

          {step === 2 && category && (
            <div className="mt-6">
              <h2 className="text-xl text-white" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                3. Controlla e invia
              </h2>
              <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-lg border border-white/10 bg-[#111] p-4 text-sm">
                <dt className="text-white/45">Categoria</dt>
                <dd className="text-white/85">{category.title}</dd>
                <dt className="text-white/45">Area</dt>
                <dd className="text-white/85">{areaName(areaId)}</dd>
                <dt className="text-white/45">Urgenza</dt>
                <dd className="text-white/85 capitalize">{priority}</dd>
                <dt className="text-white/45">Titolo</dt>
                <dd className="text-white">{title}</dd>
                <dt className="text-white/45">Descrizione</dt>
                <dd className="whitespace-pre-wrap text-white/75">{description}</dd>
                {technical && (
                  <>
                    <dt className="text-white/45">Dettagli</dt>
                    <dd className="break-all text-white/60">{technical}</dd>
                  </>
                )}
              </dl>
              <p className="mt-3 text-xs text-white/45">
                La segnalazione viene salvata come &quot;Aperta&quot;. Dopo l'invio puoi chiedere all'assistente della categoria di analizzarla. Non scrivere nomi o telefoni dei clienti.
              </p>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-4">
            <button
              type="button"
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0 || pending}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-xs text-white/65 transition hover:text-white disabled:opacity-30"
            >
              <ArrowLeft size={13} aria-hidden />
              Torna indietro
            </button>
            <button
              type="button"
              onClick={next}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-full bg-gold px-6 py-2 text-sm font-semibold text-black transition hover:bg-gold-light disabled:opacity-50"
            >
              {step < 2 ? 'Avanti' : pending ? 'Invio...' : 'Invia segnalazione'}
              <ArrowRight size={14} aria-hidden />
            </button>
          </div>
        </div>

        {/* Pannello con foto */}
        <aside className="relative hidden min-h-[420px] overflow-hidden lg:block" aria-hidden>
          <div
            className="absolute inset-0 bg-cover"
            style={{ backgroundImage: 'url(/assets/gallery/1000313548.jpg)', backgroundPosition: 'center 35%', filter: 'sepia(0.55) saturate(0.7) brightness(0.4)' }}
          />
          <div className="absolute inset-0 bg-gradient-to-l from-black/30 via-black/40 to-[#0c0c0c]" />
          <p className="absolute inset-x-6 top-1/2 -translate-y-1/2 text-center text-2xl italic leading-snug text-gold" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
            &ldquo;Il tuo feedback ci aiuta a migliorare.&rdquo;
          </p>
        </aside>
      </div>

      {/* Elenco segnalazioni */}
      <section aria-labelledby="rep-list">
        <h2 id="rep-list" className="text-xl text-white" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
          Le tue segnalazioni <span className="font-sans text-sm text-white/40">({reports.length})</span>
        </h2>
        {reports.length === 0 ? (
          <p className="mt-3 text-sm text-white/45">Nessuna segnalazione inviata.</p>
        ) : (
          <div className="mt-3 space-y-2.5">
            {reports.map((r) => {
              const st = STATUS[r.status] ?? STATUS.in_analisi;
              const pr = PRIORITIES.find((x) => x.id === r.priority);
              const closed = r.status === 'risolto_manuale' || r.status === 'chiuso';
              return (
                <article key={r.id} className="rounded-xl border border-white/10 bg-[#0e0e0e] px-4 py-3">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
                    <span className={cn('rounded-full border px-2 py-px font-semibold', st.cls)}>{st.label}</span>
                    {pr && <span className={cn('rounded-full border px-2 py-px font-semibold uppercase tracking-wider', pr.cls)}>{pr.label}</span>}
                    <span className="text-white/45">{r.areaName}</span>
                    <span className="ml-auto text-white/35">
                      {new Date(r.createdAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Rome' })}
                    </span>
                  </div>
                  <h3 className="mt-1.5 text-[15px] font-semibold leading-snug text-white">{r.title}</h3>
                  <p className="mt-0.5 line-clamp-2 whitespace-pre-wrap text-[13px] leading-snug text-white/55">{r.description}</p>
                  {!closed && (
                    <div className="mt-2.5 border-t border-white/8 pt-2.5">
                      <IssueAssistantPanel reportId={r.id} initial={r.aiProposal} readOnly={readOnly} />
                    </div>
                  )}
                  <div className="mt-2.5 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => remove(r)}
                      disabled={pending}
                      className="inline-flex items-center gap-1 rounded-full py-1 text-[11px] text-white/35 transition hover:text-red-400 disabled:opacity-40"
                      aria-label={`Elimina ${r.title}`}
                    >
                      <Trash2 size={12} aria-hidden /> Elimina
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus(r, closed ? 'in_analisi' : 'risolto_manuale')}
                      disabled={pending}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold transition disabled:opacity-40',
                        closed ? 'border border-white/15 text-white/60 hover:text-white' : 'bg-gold text-black hover:bg-gold-light'
                      )}
                    >
                      {!closed && <Check size={12} aria-hidden />}
                      {closed ? 'Riapri' : 'Segna risolta'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
