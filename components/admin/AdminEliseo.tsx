'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, Columns3, List, MessageCircle, PhoneCall, Search } from 'lucide-react';
import {
  FASE_HINT,
  FASE_LABEL,
  FASI,
  filtraContatti,
  ordinaDaRichiamare,
  riepilogo,
  testoRichiamo,
  whatsappUrl,
  type Contatto,
  type Fase,
} from '@/lib/utils/eliseo';

type Tab = 'richiamare' | 'elenco' | 'fasi';

function giorno(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Rome' });
}
function quando(c: Contatto) {
  if (c.giorniDa === null) return 'mai venuto';
  if (c.giorniDa === 0) return 'oggi';
  if (c.giorniDa === 1) return 'ieri';
  return `${c.giorniDa} giorni fa`;
}

const FASE_CLASS: Record<Fase, string> = {
  prenotato: 'border-gold bg-gold/15 text-gold-light',
  nuovo: 'border-white/30 text-white/85',
  abituale: 'border-gold/60 text-gold-light',
  cliente: 'border-white/20 text-white/70',
  da_richiamare: 'border-gold bg-gold text-black',
  perso: 'border-white/15 text-white/45',
};

function Badge({ fase }: { fase: Fase }) {
  return (
    <span title={FASE_HINT[fase]} className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${FASE_CLASS[fase]}`}>
      {FASE_LABEL[fase]}
    </span>
  );
}

const STATO: Record<string, string> = { confirmed: 'Prenotato', completed: 'Fatto', no_show: 'Non venuto' };

function Azioni({ c, tester, prenotaUrl, aperta, onScheda }: { c: Contatto; tester: boolean; prenotaUrl: string; aperta: boolean; onScheda: () => void }) {
  const wa = tester ? null : whatsappUrl(c.customer_phone, testoRichiamo(c, prenotaUrl));
  return (
    <div className="flex flex-wrap gap-2">
      {wa && (
        <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-gold px-4 text-sm font-semibold text-gold-light">
          <MessageCircle size={15} aria-hidden /> WhatsApp
        </a>
      )}
      {!tester && c.customer_phone && (
        <a href={`tel:${c.customer_phone.replace(/[^\d+]/g, '')}`} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/15 px-4 text-sm font-semibold text-white/80">
          <PhoneCall size={15} aria-hidden /> Chiama
        </a>
      )}
      <button
        type="button"
        onClick={onScheda}
        aria-expanded={aperta}
        className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/15 px-4 text-sm font-semibold text-white/80"
      >
        Scheda <ChevronDown size={15} aria-hidden className={`transition ${aperta ? 'rotate-180' : ''}`} />
      </button>
    </div>
  );
}

/** Scheda del contatto: dati e ultimi appuntamenti, presi dalle prenotazioni (non dall'account del sito). */
function Scheda({ c }: { c: Contatto }) {
  return (
    <div className="mt-3 border-t border-dashed border-white/15 pt-3 text-sm">
      <dl className="grid gap-1 text-white/75 sm:grid-cols-2">
        <div>
          <dt className="text-[11px] uppercase tracking-widest text-white/40">Telefono</dt>
          <dd className="tabular-nums">{c.customer_phone || '—'}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-widest text-white/40">Email</dt>
          <dd className="break-all">{c.customer_email || '—'}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-widest text-white/40">Torna di solito</dt>
          <dd>ogni {c.ritornoGiorni} giorni circa</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-widest text-white/40">Prossimo appuntamento</dt>
          <dd>{giorno(c.prossimo)}</dd>
        </div>
      </dl>
      <p className="mt-3 text-[11px] uppercase tracking-widest text-white/40">Ultimi appuntamenti</p>
      <ul className="mt-1 divide-y divide-white/5">
        {c.storico.map((v, i) => (
          <li key={`${v.starts_at}-${i}`} className="flex flex-wrap items-baseline justify-between gap-x-3 py-1.5">
            <span className="text-white/85">{giorno(v.starts_at)}</span>
            <span className="min-w-0 flex-1 text-white/60">
              {v.servizio ?? '—'}
              {v.barbiere ? ` · ${v.barbiere}` : ''}
            </span>
            <span className={`text-xs ${v.stato === 'no_show' ? 'text-white/40' : v.stato === 'confirmed' ? 'text-gold-light' : 'text-white/55'}`}>{STATO[v.stato] ?? v.stato}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Card({ c, tester, prenotaUrl, compact = false }: { c: Contatto; tester: boolean; prenotaUrl: string; compact?: boolean }) {
  const [aperta, setAperta] = useState(false);
  return (
    <article className="rounded-xl border border-white/10 bg-[#0e0e0e] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-semibold text-white">{c.customer_name}</h3>
        <Badge fase={c.fase} />
      </div>
      <p className="mt-1 text-xs text-white/55">
        {c.fase === 'prenotato' ? `Prossimo: ${giorno(c.prossimo)}` : `Ultima visita ${quando(c)}`}
        {' · '}
        {c.visite} {c.visite === 1 ? 'visita' : 'visite'}
        {c.barbiere ? ` · con ${c.barbiere}` : ''}
        {c.assenze ? ` · ${c.assenze} ${c.assenze === 1 ? 'assenza' : 'assenze'}` : ''}
      </p>
      {!compact && c.ultimoServizio && <p className="mt-0.5 text-xs text-white/40">{c.ultimoServizio}</p>}
      {!compact && (
        <div className="mt-3">
          <Azioni c={c} tester={tester} prenotaUrl={prenotaUrl} aperta={aperta} onScheda={() => setAperta((v) => !v)} />
        </div>
      )}
      {compact && (
        <button type="button" onClick={() => setAperta((v) => !v)} aria-expanded={aperta} className="mt-2 text-xs font-semibold text-gold-light">
          {aperta ? 'Chiudi scheda' : 'Apri scheda'}
        </button>
      )}
      {aperta && <Scheda c={c} />}
    </article>
  );
}

export function AdminEliseo({ contatti, tester, prenotaUrl }: { contatti: Contatto[]; tester: boolean; prenotaUrl: string }) {
  const [tab, setTab] = useState<Tab>('richiamare');
  const [q, setQ] = useState('');
  const [fase, setFase] = useState<Fase | ''>('');
  const [barbiere, setBarbiere] = useState('');
  const [quanti, setQuanti] = useState(30);

  const sum = useMemo(() => riepilogo(contatti), [contatti]);
  const barbieri = useMemo(() => [...new Set(contatti.map((c) => c.barbiere).filter(Boolean) as string[])].sort(), [contatti]);
  const daRichiamare = useMemo(() => ordinaDaRichiamare(filtraContatti(contatti, { q, barbiere })), [contatti, q, barbiere]);
  const filtrati = useMemo(() => filtraContatti(contatti, { q, fase, barbiere }), [contatti, q, fase, barbiere]);

  const tabs: { id: Tab; label: string; icon: typeof List; badge?: number }[] = [
    { id: 'richiamare', label: 'Da richiamare', icon: MessageCircle, badge: sum.daRichiamare },
    { id: 'elenco', label: 'Rubrica', icon: List },
    { id: 'fasi', label: 'Fasi', icon: Columns3 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['Contatti', sum.totale, 'negli ultimi 2 anni'],
          ['Prenotati', sum.perFase.prenotato, 'hanno un appuntamento'],
          ['Da richiamare', sum.daRichiamare, 'tempo giusto passato'],
          ['Nuovi', sum.nuovi30, 'prima visita negli ultimi 30 giorni'],
        ].map(([t, n, s]) => (
          <div key={t as string} className="rounded-xl border border-white/10 bg-[#0e0e0e] p-4">
            <p className="text-xs uppercase tracking-widest text-white/50">{t}</p>
            <p className="mt-1 font-display text-3xl text-gold-light">{n}</p>
            <p className="text-xs text-white/45">{s}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Viste di Eliseo">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition ${
              tab === t.id ? 'border-gold bg-gold text-black' : 'border-white/15 text-white/75 hover:border-gold/60'
            }`}
          >
            <t.icon size={15} aria-hidden /> {t.label}
            {!!t.badge && <span className={`rounded-full px-1.5 text-[11px] ${tab === t.id ? 'bg-black/20' : 'bg-gold text-black'}`}>{t.badge}</span>}
          </button>
        ))}
      </div>

      <div className="grid gap-2.5 sm:grid-cols-[1.6fr_1fr_1fr]">
        <label className="admin-filter">
          <Search size={15} aria-hidden />
          <span className="sr-only">Cerca</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome, telefono o email" />
        </label>
        {tab === 'elenco' ? (
          <label className="admin-filter">
            <span className="sr-only">Fase</span>
            <select value={fase} onChange={(e) => setFase(e.target.value as Fase | '')}>
              <option value="">Tutte le fasi</option>
              {FASI.map((f) => (
                <option key={f} value={f}>
                  {FASE_LABEL[f]} ({sum.perFase[f]})
                </option>
              ))}
            </select>
          </label>
        ) : (
          <span className="hidden sm:block" />
        )}
        <label className="admin-filter">
          <span className="sr-only">Barbiere</span>
          <select value={barbiere} onChange={(e) => setBarbiere(e.target.value)}>
            <option value="">Tutti i barbieri</option>
            {barbieri.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>
      </div>

      {tab === 'richiamare' && (
        <section className="space-y-3">
          <p className="text-sm text-white/55">
            Clienti che dovrebbero essere già tornati e non hanno prenotato. Prima chi è in ritardo da meno tempo. Il messaggio WhatsApp è già scritto: lo apri, lo controlli e lo mandi tu.
            {tester && ' In modalità tester nomi e numeri sono nascosti.'}
          </p>
          {daRichiamare.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-white/50">Nessuno da richiamare. Ottimo.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {daRichiamare.slice(0, quanti).map((c) => (
                <Card key={c.key} c={c} tester={tester} prenotaUrl={prenotaUrl} />
              ))}
            </div>
          )}
          {daRichiamare.length > quanti && (
            <button type="button" onClick={() => setQuanti((n) => n + 30)} className="min-h-10 rounded-full border border-white/15 px-4 text-sm font-semibold text-white/80">
              Mostra altri {Math.min(30, daRichiamare.length - quanti)}
            </button>
          )}
        </section>
      )}

      {tab === 'elenco' && (
        <section className="space-y-3">
          <p className="text-xs text-white/45">{filtrati.length} contatti</p>
          <div className="grid gap-3 md:grid-cols-2">
            {filtrati.slice(0, quanti).map((c) => (
              <Card key={c.key} c={c} tester={tester} prenotaUrl={prenotaUrl} />
            ))}
          </div>
          {filtrati.length > quanti && (
            <button type="button" onClick={() => setQuanti((n) => n + 30)} className="min-h-10 rounded-full border border-white/15 px-4 text-sm font-semibold text-white/80">
              Mostra altri {Math.min(30, filtrati.length - quanti)}
            </button>
          )}
        </section>
      )}

      {tab === 'fasi' && (
        <section className="flex snap-x gap-3 overflow-x-auto pb-2">
          {FASI.map((f) => {
            const col = filtraContatti(contatti, { q, fase: f, barbiere });
            return (
              <div key={f} className="w-72 shrink-0 snap-start rounded-xl border border-white/10 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Badge fase={f} />
                  <span className="text-xs text-white/50">{col.length}</span>
                </div>
                <p className="mb-3 text-[11px] text-white/40">{FASE_HINT[f]}</p>
                <div className="space-y-2">
                  {col.slice(0, 20).map((c) => (
                    <Card key={c.key} c={c} tester={tester} prenotaUrl={prenotaUrl} compact />
                  ))}
                  {col.length > 20 && <p className="text-center text-[11px] text-white/40">e altri {col.length - 20} nella Rubrica</p>}
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
