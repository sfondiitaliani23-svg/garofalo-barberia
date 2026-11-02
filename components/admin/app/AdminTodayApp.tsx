'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Bell, ChevronRight, MessageCircle, Phone } from 'lucide-react';
import { updateAppointmentStatus } from '@/lib/actions/admin';
import { normalizeItalianPhone } from '@/lib/utils/phone';

/**
 * «Oggi» in stile app (02/11/2026, solo telefono): titolo grande, striscia dei giorni, prossimo cliente
 * con azioni rapide, agenda di oggi con righe da scorrere (Fatto / Disdici) e «Annulla» per 8 secondi.
 * Usa solo le azioni che esistono già (updateAppointmentStatus).
 */

export type TodayApt = {
  id: string;
  starts_at: string;
  ends_at: string | null;
  status: string;
  customer_name: string | null;
  customer_phone: string | null;
  barber: { name: string } | null;
  service: { name: string } | null;
};

const TZ = 'Europe/Rome';
const fmtTime = new Intl.DateTimeFormat('it-IT', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
const fmtDay = new Intl.DateTimeFormat('it-IT', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' });
const fmtDow = new Intl.DateTimeFormat('it-IT', { timeZone: TZ, weekday: 'short' });
const fmtNum = new Intl.DateTimeFormat('it-IT', { timeZone: TZ, day: 'numeric' });
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('') || 'A';

function minutesUntil(iso: string, nowMs: number) {
  return Math.round((Date.parse(iso) - nowMs) / 60000);
}

function SwipeRow({ apt, onStatus }: { apt: TodayApt; onStatus: (apt: TodayApt, status: 'completed' | 'cancelled') => void }) {
  const start = useRef<{ x: number; y: number; base: number } | null>(null);
  const [dx, setDx] = useState(0);
  const [drag, setDrag] = useState(false);
  const OPEN = -132;
  const moved = useRef(false);
  const done = apt.status === 'completed';
  return (
    <li className="app-row">
      <div className="app-row-actions" aria-hidden={dx === 0}>
        <button type="button" className="app-row-act app-row-act--ok" onClick={() => { setDx(0); onStatus(apt, 'completed'); }}>Fatto</button>
        <button type="button" className="app-row-act app-row-act--ko" onClick={() => { setDx(0); onStatus(apt, 'cancelled'); }}>Disdici</button>
      </div>
      <Link
        href="/admin/prenotazioni"
        className="app-row-main"
        style={{ transform: `translateX(${dx}px)`, transition: drag ? 'none' : 'transform .25s cubic-bezier(.22,1,.36,1)' }}
        onPointerDown={(e) => { start.current = { x: e.clientX, y: e.clientY, base: dx }; moved.current = false; }}
        onPointerMove={(e) => {
          const s = start.current;
          if (!s) return;
          const mx = e.clientX - s.x;
          if (!drag && Math.abs(mx) < 8) return;
          if (!drag && Math.abs(e.clientY - s.y) > Math.abs(mx)) { start.current = null; return; }
          moved.current = true;
          setDrag(true);
          setDx(Math.max(OPEN - 20, Math.min(0, s.base + mx)));
        }}
        onPointerUp={() => { if (start.current && drag) setDx((v) => (v < OPEN / 2 ? OPEN : 0)); start.current = null; setDrag(false); }}
        onPointerCancel={() => { start.current = null; setDrag(false); setDx(0); }}
        onClick={(e) => { if (moved.current || dx !== 0) { e.preventDefault(); if (!moved.current) setDx(0); } }}
      >
        <span className="app-row-time">{fmtTime.format(new Date(apt.starts_at))}</span>
        <span className={`app-row-bar${done ? ' is-done' : ''}`} aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-bold text-[#f7ecd0]">{apt.service?.name ?? 'Appuntamento'}</span>
          <span className="block truncate text-xs text-[#bda980]">{apt.customer_name || 'Cliente'} · {apt.barber?.name?.split(' ')[0] ?? ''}{done ? ' · fatto' : ''}</span>
        </span>
        <ChevronRight size={16} className="shrink-0 text-[#bda980]" aria-hidden />
      </Link>
    </li>
  );
}

export function AdminTodayApp({ appointments, now, userName }: { appointments: TodayApt[]; now: string; userName: string }) {
  const router = useRouter();
  const nowMs = Date.parse(now);
  const [list, setList] = useState(appointments);

  const live = useMemo(() => list.filter((a) => a.status === 'confirmed' || a.status === 'completed'), [list]);
  const next = useMemo(() => live.find((a) => a.status === 'confirmed' && Date.parse(a.ends_at ?? a.starts_at) >= nowMs), [live, nowMs]);
  const week = useMemo(() => Array.from({ length: 7 }, (_, i) => new Date(nowMs + i * 86400000)), [nowMs]);

  async function setStatus(apt: TodayApt, status: 'completed' | 'cancelled') {
    const previous = apt.status;
    setList((l) => l.map((a) => (a.id === apt.id ? { ...a, status } : a)));
    try { navigator.vibrate?.(10); } catch { /* vibrazione non disponibile */ }
    const res = await updateAppointmentStatus(apt.id, status);
    if (!res.ok) {
      setList((l) => l.map((a) => (a.id === apt.id ? { ...a, status: previous } : a)));
      toast.error(res.error ?? 'Non sono riuscito a salvare.');
      return;
    }
    toast.success(status === 'completed' ? 'Segnato come fatto' : 'Prenotazione disdetta', {
      duration: 8000,
      action: {
        label: 'Annulla',
        onClick: async () => {
          const back = await updateAppointmentStatus(apt.id, previous);
          if (back.ok) {
            setList((l) => l.map((a) => (a.id === apt.id ? { ...a, status: previous } : a)));
            toast.success('Ripristinato');
            router.refresh();
          } else toast.error(back.error ?? 'Non sono riuscito a ripristinare.');
        },
      },
    });
    router.refresh();
  }

  const mins = next ? minutesUntil(next.starts_at, nowMs) : null;
  const when = mins === null ? '' : mins <= 0 ? 'ADESSO' : mins < 60 ? `TRA ${mins} MIN` : `ALLE ${fmtTime.format(new Date(next!.starts_at))}`;
  const phone = next?.customer_phone ? (normalizeItalianPhone(next.customer_phone) || next.customer_phone.replace(/\D/g, '')) : '';
  const waText = next ? encodeURIComponent(`Ciao ${next.customer_name?.split(' ')[0] ?? ''}, ti aspettiamo da Barberia Garofalo alle ${fmtTime.format(new Date(next.starts_at))}.`) : '';

  return (
    <section className="app-today lg:hidden" aria-label="Oggi">
      <header className="app-today-head">
        <div>
          <p className="app-today-date">{cap(fmtDay.format(new Date(nowMs)))}</p>
          <h1 className="app-today-title">Oggi</h1>
        </div>
        <div className="flex items-center gap-2.5">
          <Link href="/admin/messaggi" className="app-icon-btn" aria-label="Messaggi e avvisi"><Bell size={20} aria-hidden /></Link>
          <span className="app-avatar-btn" aria-hidden>{initials(userName)}</span>
        </div>
      </header>

      <nav className="app-week" aria-label="Prossimi giorni">
        {week.map((d, i) => (
          <Link key={i} href={i === 0 ? '/admin/dashboard' : '/admin/prenotazioni'} className={`app-day${i === 0 ? ' is-today' : ''}`} aria-current={i === 0 ? 'date' : undefined}>
            <span className="app-day-dow">{fmtDow.format(d).replace('.', '').toUpperCase()}</span>
            <span className="app-day-num">{fmtNum.format(d)}</span>
          </Link>
        ))}
      </nav>

      {next ? (
        <article className="app-next">
          <span className="app-next-glow" aria-hidden />
          <div className="flex items-center justify-between">
            <span className="app-next-when">PROSSIMO · {when}</span>
            <span className="app-next-ok">Confermato</span>
          </div>
          <h2 className="app-next-title">{next.service?.name ?? 'Appuntamento'}</h2>
          <p className="app-next-sub">
            {next.customer_name || 'Cliente'} · {fmtTime.format(new Date(next.starts_at))}
            {next.ends_at ? ` – ${fmtTime.format(new Date(next.ends_at))}` : ''} · con <b>{next.barber?.name?.split(' ')[0] ?? ''}</b>
          </p>
          <div className="flex gap-2">
            <button type="button" className="app-next-main" onClick={() => setStatus(next, 'completed')}>Fatto</button>
            {phone.length >= 8 && (
              <>
                <a className="app-next-round" href={`https://wa.me/${phone}?text=${waText}`} target="_blank" rel="noopener noreferrer" aria-label="Scrivi su WhatsApp"><MessageCircle size={19} aria-hidden /></a>
                <a className="app-next-round" href={`tel:+${phone}`} aria-label="Chiama"><Phone size={19} aria-hidden /></a>
              </>
            )}
          </div>
        </article>
      ) : (
        <article className="app-next app-next--empty">
          <span className="app-next-glow" aria-hidden />
          <span className="app-next-when">OGGI</span>
          <h2 className="app-next-title">{live.length ? 'Giornata finita' : 'Nessun appuntamento'}</h2>
          <p className="app-next-sub">Tocca + per una nuova prenotazione.</p>
        </article>
      )}

      <div className="app-today-sec">
        <h2>Agenda di oggi</h2>
        <Link href="/admin/prenotazioni">{live.length} {live.length === 1 ? 'appuntamento' : 'appuntamenti'}</Link>
      </div>
      {live.length > 0 ? (
        <>
          <ul className="app-list">
            {live.map((a) => <SwipeRow key={a.id} apt={a} onStatus={setStatus} />)}
          </ul>
          <p className="app-hint">Scorri una riga a sinistra: Fatto o Disdici.</p>
        </>
      ) : (
        <p className="app-hint">Nessun appuntamento confermato per oggi.</p>
      )}
    </section>
  );
}
