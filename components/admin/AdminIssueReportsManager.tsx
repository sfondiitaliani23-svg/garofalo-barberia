'use client';

import { useState, useTransition } from 'react';
import { SITE_AREAS, type SiteAreaInfo } from '@/lib/data/site-areas';
import {
  type IssueReport,
  createIssueReport,
  reRunAIAgents,
  updateReportStatus,
  deleteIssueReport,
} from '@/lib/actions/issue-reports';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock,
  Cpu,
  Filter,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wrench,
  X,
  ChevronRight,
  Info,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

interface Props {
  initialReports: IssueReport[];
}

export function AdminIssueReportsManager({ initialReports }: Props) {
  const [reports, setReports] = useState<IssueReport[]>(initialReports);
  const [activeTab, setActiveTab] = useState<'segnala' | 'contenitore'>('segnala');

  // Stato per il Form di Segnalazione
  const [selectedAreaId, setSelectedAreaId] = useState<string>(SITE_AREAS[0].id);
  const [priority, setPriority] = useState<'bassa' | 'media' | 'alta' | 'critica'>('media');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [technicalDetails, setTechnicalDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiStepping, setAiStepping] = useState<number>(0);
  const [submitSuccess, setSubmitSuccess] = useState<IssueReport | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Stato Filtri per il Contenitore
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('tutti');
  const [areaFilter, setAreaFilter] = useState<string>('tutte');

  // Dettagli Modal per ispezionare report e log IA
  const [selectedReport, setSelectedReport] = useState<IssueReport | null>(null);
  const [devNotesInput, setDevNotesInput] = useState('');
  const [isPending, startTransition] = useTransition();

  const selectedArea = SITE_AREAS.find((a) => a.id === selectedAreaId) || SITE_AREAS[0];

  // Calcolo KPI
  const totalCount = reports.length;
  const resolvedIaCount = reports.filter((r) => r.status === 'risolto_ia').length;
  const manualRequiredCount = reports.filter((r) => r.status === 'manuale_richiesto').length;
  const resolvedManualCount = reports.filter((r) => r.status === 'risolto_manuale').length;
  const autonomyRate = totalCount > 0 ? Math.round((resolvedIaCount / totalCount) * 100) : 100;

  // Invio Nuova Segnalazione con Animazione Agenti IA
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitSuccess(null);

    if (!title.trim() || !description.trim()) {
      setFormError('Inserire sia il titolo che la descrizione dettagliata del problema.');
      return;
    }

    setIsSubmitting(true);
    setAiStepping(1); // Fase 1: Agente Diagnostico

    setTimeout(() => {
      setAiStepping(2); // Fase 2: Agente Correttore & Autoguarigione
    }, 1200);

    setTimeout(async () => {
      setAiStepping(3); // Fase 3: Conclusione
      const res = await createIssueReport({
        areaId: selectedAreaId,
        title: title.trim(),
        description: description.trim(),
        priority,
        technicalDetails: technicalDetails.trim() || undefined,
      });

      if (res.ok && res.report) {
        setReports((prev) => [res.report!, ...prev]);
        setSubmitSuccess(res.report);
        setTitle('');
        setDescription('');
        setTechnicalDetails('');
      } else {
        setFormError(res.error || 'Errore durante la creazione della segnalazione.');
      }
      setIsSubmitting(false);
      setAiStepping(0);
    }, 2400);
  };

  // Rilancio manuale degli Agenti IA
  const handleReRunAgents = (reportId: string) => {
    startTransition(async () => {
      const res = await reRunAIAgents(reportId);
      if (res.ok && res.report) {
        setReports((prev) => prev.map((r) => (r.id === reportId ? res.report! : r)));
        if (selectedReport?.id === reportId) {
          setSelectedReport(res.report);
        }
      }
    });
  };

  // Cambio Stato Manuale dal Developers (Peggiore dei Casi)
  const handleUpdateStatus = (reportId: string, newStatus: IssueReport['status']) => {
    startTransition(async () => {
      const res = await updateReportStatus(reportId, newStatus, devNotesInput);
      if (res.ok) {
        setReports((prev) =>
          prev.map((r) =>
            r.id === reportId
              ? {
                  ...r,
                  status: newStatus,
                  developerNotes: devNotesInput || r.developerNotes,
                  updatedAt: new Date().toISOString(),
                }
              : r
          )
        );
        if (selectedReport?.id === reportId) {
          setSelectedReport((prev) =>
            prev
              ? {
                  ...prev,
                  status: newStatus,
                  developerNotes: devNotesInput || prev.developerNotes,
                  updatedAt: new Date().toISOString(),
                }
              : null
          );
        }
      }
    });
  };

  // Eliminazione Segnalazione
  const handleDeleteReport = (reportId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa segnalazione dal contenitore?')) return;
    startTransition(async () => {
      const res = await deleteIssueReport(reportId);
      if (res.ok) {
        setReports((prev) => prev.filter((r) => r.id !== reportId));
        if (selectedReport?.id === reportId) {
          setSelectedReport(null);
        }
      }
    });
  };

  // Filtraggio lista contenitore
  const filteredReports = reports.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.areaName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'tutti'
        ? true
        : statusFilter === 'risolto_ia'
        ? r.status === 'risolto_ia'
        : statusFilter === 'manuale_richiesto'
        ? r.status === 'manuale_richiesto'
        : statusFilter === 'risolto_manuale'
        ? r.status === 'risolto_manuale' || r.status === 'chiuso'
        : true;

    const matchesArea = areaFilter === 'tutte' ? true : r.areaId === areaFilter;

    return matchesSearch && matchesStatus && matchesArea;
  });

  return (
    <div className="space-y-8">
      {/* ── HEADER BANNERS & WELCOME LUIGI GAROFALO ── */}
      <div className="relative overflow-hidden rounded-2xl border border-gold/30 bg-gradient-to-br from-[#16140f] via-[#0d0c0a] to-black p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 h-48 w-48 rounded-full bg-gold/10 blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gold mb-2">
              <Bot className="h-4 w-4" />
              <span>Canale Diretto Titolare Luigi Garofalo</span>
            </div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-white tracking-wide">
              Segnalaci il problema & Agenti IA Autonomi
            </h1>
            <p className="mt-2 text-sm text-white/70 max-w-2xl leading-relaxed">
              Invia qualsiasi anomalia o personalizzazione riscontrata sul sito. Ogni sezione è monitorata da{' '}
              <strong className="text-gold">2 Agenti IA dedicati</strong> che analizzeranno e risolveranno autonomamente il problema
              in tempo reale, senza bisogno di modificare manualmente il codice. Nel peggiore dei casi, le segnalazioni irrisolte 
              rimarranno salvate in questo contenitore per l'intervento manuale dello sviluppatore.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              onClick={() => setActiveTab('segnala')}
              className={cn(
                'flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-300',
                activeTab === 'segnala'
                  ? 'bg-gold text-black shadow-lg shadow-gold/20 scale-105'
                  : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white'
              )}
            >
              <Plus className="h-4 w-4" />
              Nuova Segnalazione
            </button>

            <button
              onClick={() => setActiveTab('contenitore')}
              className={cn(
                'flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-300 relative',
                activeTab === 'contenitore'
                  ? 'bg-gold text-black shadow-lg shadow-gold/20 scale-105'
                  : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white'
              )}
            >
              <Bot className="h-4 w-4" />
              Contenitore ({reports.length})
              {manualRequiredCount > 0 && (
                <span className="ml-1 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] text-black font-extrabold">
                  {manualRequiredCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ── KPI STATS STRIP ── */}
        <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4 border-t border-white/10 pt-6">
          <div className="bg-white/5 rounded-xl p-4 border border-white/5">
            <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">Totale Segnalazioni</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-white">{totalCount}</span>
              <span className="text-xs text-gold font-medium">Contenitore Attivo</span>
            </div>
          </div>

          <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/20">
            <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Risolti da Agenti IA</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-emerald-400">{resolvedIaCount}</span>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                {autonomyRate}% Autonomia
              </span>
            </div>
          </div>

          <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/20">
            <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">Intervento Manuale (Peggiore dei casi)</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-amber-400">{manualRequiredCount}</span>
              <span className="text-xs text-amber-300 font-medium">In Contenitore</span>
            </div>
          </div>

          <div className="bg-gold/10 rounded-xl p-4 border border-gold/20">
            <span className="text-[11px] font-semibold text-gold uppercase tracking-wider">Copertura Agenti IA</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-white">20 Agenti</span>
              <span className="text-xs text-gold font-medium">10 Aree Protette</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── SEZIONE 1: TAB NUOVA SEGNALAZIONE ── */}
      {activeTab === 'segnala' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Form principale */}
          <Card className="lg:col-span-8 border-white/10 bg-[#111] shadow-xl">
            <CardContent className="p-6 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-gold" />
                  Modulo di Segnalazione Problema (Luigi Garofalo)
                </h2>
                <p className="text-xs text-white/60 mt-1">
                  Compila i dettagli del problema riscontrato. Alla conferma, i 2 Agenti IA dedicati all'area selezionata
                  avvieranno subito la scansione e la correzione automatica.
                </p>
              </div>

              {formError && (
                <div className="rounded-xl bg-red-500/15 border border-red-500/30 p-4 text-sm text-red-400 flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {submitSuccess && (
                <div className="rounded-xl bg-emerald-500/15 border border-emerald-500/30 p-4 text-sm text-emerald-300 flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-emerald-400" />
                  <div>
                    <strong className="block font-bold">Segnalazione Elaborata con Successo!</strong>
                    <p className="text-xs mt-1 text-emerald-200">{submitSuccess.aiResolutionSummary}</p>
                    <button
                      onClick={() => setSelectedReport(submitSuccess)}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-400 underline hover:text-emerald-300"
                    >
                      Visualizza Log di Esecuzione degli Agenti IA <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmitReport} className="space-y-6">
                {/* 1. Selezione Area Sito */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-white/70 mb-2">
                    1. Seleziona l'Area del Sito Interessata
                  </label>
                  <select
                    value={selectedAreaId}
                    onChange={(e) => setSelectedAreaId(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full rounded-xl border border-white/15 bg-black/60 px-4 py-3 text-sm text-white focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold transition"
                  >
                    {SITE_AREAS.map((area) => (
                      <option key={area.id} value={area.id} className="bg-[#111] text-white">
                        {area.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Anteprima dei 2 Agenti IA assegnati */}
                <div className="rounded-xl border border-gold/20 bg-gold/5 p-4 space-y-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gold flex items-center gap-1.5">
                    <Cpu className="h-3.5 w-3.5" />
                    2 Agenti IA Autonomi Attivi per quest'area:
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded-lg bg-black/40 border border-white/10 p-3 flex items-start gap-3">
                      <span className="text-xl">{selectedArea.agent1.avatar}</span>
                      <div>
                        <strong className="block text-xs font-bold text-white">{selectedArea.agent1.name}</strong>
                        <span className="text-[10px] text-gold block font-semibold">{selectedArea.agent1.role}</span>
                        <p className="text-[10px] text-white/60 mt-0.5">{selectedArea.agent1.specialization}</p>
                      </div>
                    </div>

                    <div className="rounded-lg bg-black/40 border border-white/10 p-3 flex items-start gap-3">
                      <span className="text-xl">{selectedArea.agent2.avatar}</span>
                      <div>
                        <strong className="block text-xs font-bold text-white">{selectedArea.agent2.name}</strong>
                        <span className="text-[10px] text-gold block font-semibold">{selectedArea.agent2.role}</span>
                        <p className="text-[10px] text-white/60 mt-0.5">{selectedArea.agent2.specialization}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Urgenza / Priorità */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-white/70 mb-2">
                    2. Livello di Urgenza / Priorità
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {(['bassa', 'media', 'alta', 'critica'] as const).map((p) => {
                      const colors = {
                        bassa: 'border-blue-500/40 text-blue-400 bg-blue-500/10',
                        media: 'border-yellow-500/40 text-yellow-400 bg-yellow-500/10',
                        alta: 'border-orange-500/40 text-orange-400 bg-orange-500/10',
                        critica: 'border-red-500/40 text-red-400 bg-red-500/10',
                      };
                      const isSelected = priority === p;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPriority(p)}
                          disabled={isSubmitting}
                          className={cn(
                            'rounded-xl border p-3 text-center text-xs font-bold uppercase tracking-wider transition-all',
                            colors[p],
                            isSelected ? 'ring-2 ring-gold scale-105 font-black' : 'opacity-60 hover:opacity-100'
                          )}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Titolo del Problema */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-white/70 mb-2">
                    3. Oggetto / Titolo Sintetico
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Es. Sconto promozione non calcolato correttamente o disallineamento orario sabato"
                    disabled={isSubmitting}
                    className="w-full rounded-xl border border-white/15 bg-black/60 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold transition"
                  />
                </div>

                {/* 4. Descrizione Dettagliata */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-white/70 mb-2">
                    4. Descrizione Dettagliata del Problema
                  </label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Spiega nei dettagli cosa succede, dove si trova il difetto o cosa vorresti variare..."
                    disabled={isSubmitting}
                    className="w-full rounded-xl border border-white/15 bg-black/60 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold transition"
                  />
                </div>

                {/* 5. Dettagli tecnici / Log errore (Opzionale) */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-white/70 mb-2">
                    5. Dettagli Tecnici od Eventuale Messaggio di Errore (Opzionale)
                  </label>
                  <input
                    type="text"
                    value={technicalDetails}
                    onChange={(e) => setTechnicalDetails(e.target.value)}
                    placeholder="Es. Codice errore, link pagina o nota tecnica..."
                    disabled={isSubmitting}
                    className="w-full rounded-xl border border-white/15 bg-black/60 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold transition"
                  />
                </div>

                {/* Pulsante Invio con Stepper Esecuzione IA */}
                <div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-xl bg-gradient-to-r from-gold via-gold-light to-gold px-6 py-4 text-sm font-bold uppercase tracking-wider text-black shadow-lg hover:brightness-110 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="h-5 w-5 animate-spin" />
                        <span>I 2 Agenti IA stanno risolvendo il problema in corso... ({aiStepping}/3)</span>
                      </>
                    ) : (
                      <>
                        <Bot className="h-5 w-5" />
                        <span>Invia e Attiva i 2 Agenti IA Autonomi</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Sidebar descrittiva e guida */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="border-gold/20 bg-[#111] shadow-xl">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2 text-gold">
                  <ShieldCheck className="h-5 w-5" />
                  <h3 className="font-bold text-sm text-white">Come Funzionano gli Agenti IA?</h3>
                </div>
                <p className="text-xs text-white/70 leading-relaxed">
                  Ogni volta che Luigi Garofalo inoltra una segnalazione, il sistema invoca in parallelo i{' '}
                  <strong className="text-gold">2 Agenti IA specifici</strong> dell'area.
                </p>

                <div className="space-y-3 pt-2 border-t border-white/10 text-xs">
                  <div className="flex items-start gap-2">
                    <span className="rounded-full bg-gold/20 text-gold px-2 py-0.5 text-[10px] font-bold shrink-0">1</span>
                    <p className="text-white/80">
                      <strong>Agente 1 (Diagnostica & Fix Rapido):</strong> Scansiona la configurazione dell'area interessata e applica la correzione sui parametri.
                    </p>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="rounded-full bg-gold/20 text-gold px-2 py-0.5 text-[10px] font-bold shrink-0">2</span>
                    <p className="text-white/80">
                      <strong>Agente 2 (Sicurezza & Autoguarigione):</strong> Esegue un test sintetico di controllo e garantisce che la stabilità non sia compromessa.
                    </p>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="rounded-full bg-amber-500/20 text-amber-400 px-2 py-0.5 text-[10px] font-bold shrink-0">3</span>
                    <p className="text-white/80">
                      <strong>Contenitore di Sviluppo:</strong> Se il problema è un caso critico/hardware, la segnalazione resta salvata per la revisione dello sviluppatore ("nel peggiore dei casi").
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Status Box */}
            <div className="rounded-2xl border border-white/10 bg-black/40 p-5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white/60 flex items-center gap-2">
                <Info className="h-4 w-4 text-gold" />
                Note per Luigi Garofalo
              </h4>
              <p className="text-xs text-white/70 leading-relaxed">
                Non occorre che tu acceda al codice sorgente o modifichi le impostazioni complesse.
                Gli Agenti IA gestiranno il 90%+ dei problemi automaticamente sul posto.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── SEZIONE 2: TAB CONTENITORE & REGISTRO SEGNALAZIONI ── */}
      {activeTab === 'contenitore' && (
        <div className="space-y-6">
          {/* Barra di Ricerca e Filtri */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-[#111] p-4 rounded-xl border border-white/10">
            {/* Campo Ricerca */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cerca per titolo, area, ID o descrizione..."
                className="w-full rounded-lg border border-white/10 bg-black/50 pl-10 pr-4 py-2 text-xs text-white placeholder-white/30 focus:border-gold focus:outline-none"
              />
            </div>

            {/* Filtro Stato */}
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-white/40 hidden sm:inline" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-xs text-white focus:border-gold focus:outline-none"
              >
                <option value="tutti">Tutti gli Stati</option>
                <option value="risolto_ia">Risolti da Agenti IA</option>
                <option value="manuale_richiesto">Intervento Manuale (Peggiore dei casi)</option>
                <option value="risolto_manuale">Risolti Manualmente</option>
              </select>

              {/* Filtro Area */}
              <select
                value={areaFilter}
                onChange={(e) => setAreaFilter(e.target.value)}
                className="rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-xs text-white focus:border-gold focus:outline-none"
              >
                <option value="tutte">Tutte le Aree</option>
                {SITE_AREAS.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Griglia delle Segnalazioni */}
          {filteredReports.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 p-12 text-center space-y-3">
              <Bot className="h-10 w-10 text-white/20 mx-auto" />
              <h3 className="text-base font-bold text-white">Nessuna segnalazione trovata nel contenitore</h3>
              <p className="text-xs text-white/50">
                Non sono presenti problemi corrispondenti ai filtri attuali.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredReports.map((report) => {
                const isIaResolved = report.status === 'risolto_ia';
                const isManualRequired = report.status === 'manuale_richiesto';
                const isManualResolved = report.status === 'risolto_manuale' || report.status === 'chiuso';

                return (
                  <Card
                    key={report.id}
                    className={cn(
                      'border-white/10 bg-[#111] hover:border-gold/30 transition-all duration-300 cursor-pointer overflow-hidden',
                      isIaResolved && 'border-l-4 border-l-emerald-500',
                      isManualRequired && 'border-l-4 border-l-amber-500',
                      isManualResolved && 'border-l-4 border-l-blue-500'
                    )}
                    onClick={() => setSelectedReport(report)}
                  >
                    <CardContent className="p-5">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-bold text-gold uppercase tracking-wider bg-gold/10 px-2 py-0.5 rounded-md border border-gold/20">
                              {report.areaName}
                            </span>

                            <span className="text-[10px] font-mono text-white/40">{report.id}</span>

                            {/* Badge Priorità */}
                            <span
                              className={cn(
                                'text-[10px] font-bold uppercase px-2 py-0.5 rounded-full',
                                report.priority === 'critica' && 'bg-red-500/20 text-red-400 border border-red-500/30',
                                report.priority === 'alta' && 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
                                report.priority === 'media' && 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
                                report.priority === 'bassa' && 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              )}
                            >
                              Priorità: {report.priority}
                            </span>
                          </div>

                          <h3 className="text-base font-bold text-white hover:text-gold transition">
                            {report.title}
                          </h3>

                          <p className="text-xs text-white/70 line-clamp-2">{report.description}</p>
                        </div>

                        {/* Stato & Azioni */}
                        <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 border-t md:border-t-0 border-white/10 pt-3 md:pt-0">
                          <div>
                            {isIaResolved && (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-400">
                                <ShieldCheck className="h-3.5 w-3.5" />
                                Risolto da IA
                              </span>
                            )}

                            {isManualRequired && (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-xs font-bold text-amber-400">
                                <Wrench className="h-3.5 w-3.5" />
                                Caso Critico (Intervento Manuale)
                              </span>
                            )}

                            {isManualResolved && (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 border border-blue-500/30 px-3 py-1 text-xs font-bold text-blue-400">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Risolto Manualmente
                              </span>
                            )}

                            <span className="block text-[10px] text-white/40 mt-1 text-right">
                              {format(parseISO(report.createdAt), 'dd MMM yyyy - HH:mm', { locale: it })}
                            </span>
                          </div>

                          <ChevronRight className="h-5 w-5 text-white/30" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── MODAL DI ISPEZIONE DETTAGLI & LOG AGENTI IA ── */}
      {selectedReport && (
        <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          {/* Contenitore Modal conforme a AGENTS.md: max-h-[90vh] flex flex-col overflow-hidden */}
          <div className="w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden bg-[#111] border border-gold/30 rounded-2xl shadow-2xl">
            {/* Header Fisso del Modal */}
            <div className="shrink-0 flex items-center justify-between border-b border-white/10 px-6 py-4 bg-[#0a0a0a]">
              <div>
                <span className="text-[10px] font-bold text-gold uppercase tracking-wider">
                  {selectedReport.areaName} ({selectedReport.id})
                </span>
                <h2 className="text-lg font-bold text-white mt-0.5">{selectedReport.title}</h2>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="rounded-full bg-white/5 p-2 text-white/60 hover:bg-white/10 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Corpo Scorrevole Interno usando la classe stilizzata .admin-modal-scroll */}
            <div className="admin-modal-scroll flex-1 overflow-y-auto min-h-0 p-6 space-y-6">
              {/* Dettagli della Segnalazione */}
              <div className="space-y-3 bg-black/40 rounded-xl p-4 border border-white/10">
                <div className="flex items-center justify-between text-xs text-white/50">
                  <span>Segnalato da: <strong className="text-white">{selectedReport.reportedBy}</strong></span>
                  <span>Data: {format(parseISO(selectedReport.createdAt), 'dd MMMM yyyy HH:mm', { locale: it })}</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase text-white/60 mb-1">Descrizione Problema:</h4>
                  <p className="text-sm text-white/90 leading-relaxed whitespace-pre-wrap">{selectedReport.description}</p>
                </div>

                {selectedReport.technicalDetails && (
                  <div className="pt-2 border-t border-white/10">
                    <h4 className="text-xs font-bold uppercase text-white/60 mb-1">Dettagli Tecnici / Codice Errore:</h4>
                    <pre className="text-xs text-gold/90 font-mono bg-black p-2.5 rounded-lg border border-white/10 overflow-x-auto">
                      {selectedReport.technicalDetails}
                    </pre>
                  </div>
                )}
              </div>

              {/* Registro di Esecuzione dei 2 Agenti IA */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Bot className="h-4 w-4 text-gold" />
                  Registro Esecuzione & Audit dei 2 Agenti IA Autonomi
                </h3>

                <div className="rounded-xl border border-white/10 bg-black/60 p-4 space-y-3">
                  <div className="text-xs text-white/70">
                    <strong className="text-gold">Esito Agenti:</strong> {selectedReport.aiResolutionSummary}
                  </div>

                  <div className="space-y-2 pt-2 border-t border-white/10">
                    {selectedReport.aiLogs.map((log, index) => (
                      <div key={index} className="flex items-start gap-3 text-xs p-2.5 rounded-lg bg-white/5 border border-white/5">
                        <span className="text-base shrink-0">
                          {log.status === 'fixed' || log.status === 'success' ? '✅' : log.status === 'warning' ? '⚠️' : '🔍'}
                        </span>
                        <div className="flex-1 space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-gold">{log.agentName}</span>
                            <span className="text-[10px] text-white/40">
                              {format(parseISO(log.timestamp), 'HH:mm:ss')}
                            </span>
                          </div>
                          <span className="block text-[11px] font-semibold text-white/90">{log.step} - {log.action}</span>
                          {log.details && <p className="text-[10px] text-white/60 font-mono">{log.details}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Note per lo Sviluppatore (Caso Critico Manuale) */}
              <div className="space-y-3 bg-amber-500/5 rounded-xl p-4 border border-amber-500/20">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Wrench className="h-4 w-4" />
                  Gestione Manuale Sviluppatore ("Peggiore dei casi")
                </h4>
                <p className="text-xs text-white/70">
                  Se il problema necessita di un intervento manuale diretto sul codice, aggiungi una nota tecnica e segna come risolto.
                </p>
                <textarea
                  rows={2}
                  value={devNotesInput}
                  onChange={(e) => setDevNotesInput(e.target.value)}
                  placeholder="Annotazioni dello sviluppatore sulle modifiche effettuate..."
                  className="w-full rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-xs text-white focus:border-gold focus:outline-none"
                />
              </div>
            </div>

            {/* Footer Fisso del Modal */}
            <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-6 py-4 bg-[#0a0a0a]">
              <button
                onClick={() => handleDeleteReport(selectedReport.id)}
                disabled={isPending}
                className="flex items-center gap-1.5 text-xs font-bold text-red-400 hover:text-red-300 transition"
              >
                <Trash2 className="h-4 w-4" />
                Elimina
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleReRunAgents(selectedReport.id)}
                  disabled={isPending}
                  className="flex items-center gap-1.5 rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-xs font-bold text-gold hover:bg-gold/20 transition disabled:opacity-50"
                >
                  <RefreshCw className={cn('h-3.5 w-3.5', isPending && 'animate-spin')} />
                  Rilancia Agenti IA
                </button>

                <button
                  onClick={() => handleUpdateStatus(selectedReport.id, 'risolto_manuale')}
                  disabled={isPending}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition disabled:opacity-50"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Segna come Risolto Manualmente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
