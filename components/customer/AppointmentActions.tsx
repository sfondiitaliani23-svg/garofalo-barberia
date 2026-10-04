'use client';

import { useTransition, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Pencil } from 'lucide-react';
import { cancelAppointment } from '@/lib/actions/bookings';
import { canManageAppointment } from '@/lib/utils/appointments';

/* ─── CSS keyframes – injected once into <head> ─── */
const HUNGRY_CSS = `
@keyframes hd-suck{
  0%{transform:translateX(0) scale(1);opacity:1}
  60%{transform:translateX(-10px) scale(.65);opacity:.55}
  100%{transform:translateX(-22px) scale(0);opacity:0}
}
@keyframes hd-chomp{
  0%,100%{transform:rotate(0deg) scale(1)}
  25%{transform:rotate(-9deg) scale(1.18)}
  50%{transform:rotate(0deg) scale(1.07)}
  75%{transform:rotate(7deg) scale(1.14)}
}
@keyframes hd-ring{
  from{stroke-dashoffset:100}
  to{stroke-dashoffset:0}
}
@keyframes hd-check{
  0%{transform:translate(-50%,-50%) scale(0);opacity:0}
  60%{transform:translate(-50%,-50%) scale(1.35);opacity:1}
  100%{transform:translate(-50%,-50%) scale(1);opacity:1}
}
@keyframes hd-shake{
  0%,100%{transform:translateX(0)}
  20%{transform:translateX(-4px)}
  40%{transform:translateX(4px)}
  60%{transform:translateX(-3px)}
  80%{transform:translateX(3px)}
}
`;

function injectHungryCSS() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('hungry-delete-styles')) return;
  const style = document.createElement('style');
  style.id = 'hungry-delete-styles';
  style.textContent = HUNGRY_CSS;
  document.head.appendChild(style);
}

interface AppointmentActionsProps {
  appointmentId: string;
  startsAt: string;
}

export function AppointmentActions({ appointmentId, startsAt }: AppointmentActionsProps) {
  const router     = useRouter();
  const [pending, startTransition] = useTransition();
  const manageable = canManageAppointment(startsAt);

  const btnRef     = useRef<HTMLButtonElement>(null);
  const trashRef   = useRef<SVGSVGElement>(null);
  const ringRef    = useRef<SVGSVGElement>(null);
  const circleRef  = useRef<SVGCircleElement>(null);
  const checkRef   = useRef<HTMLSpanElement>(null);
  const lettersRef = useRef<HTMLSpanElement[]>([]);
  const busyRef    = useRef(false);

  useEffect(() => { injectHungryCSS(); }, []);

  const doCancel = useCallback(() => {
    startTransition(async () => {
      const result = await cancelAppointment(appointmentId);
      if (!result.ok) {
        toast.error(result.error);
        lettersRef.current.forEach((l) => { if (l) l.style.cssText = ''; });
        if (trashRef.current)  trashRef.current.style.animation  = '';
        if (ringRef.current)   ringRef.current.style.opacity      = '0';
        if (circleRef.current) { circleRef.current.style.animation = ''; circleRef.current.style.strokeDashoffset = '100'; }
        if (btnRef.current)    btnRef.current.style.animation = 'hd-shake 0.4s ease';
        setTimeout(() => {
          if (btnRef.current) { btnRef.current.style.animation = ''; btnRef.current.disabled = false; }
          busyRef.current = false;
        }, 500);
        return;
      }
      /* success */
      if (ringRef.current)  ringRef.current.style.opacity = '0';
      if (checkRef.current) checkRef.current.style.animation = 'hd-check 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards';
      toast.success('Prenotazione disdetta');
      setTimeout(() => { router.refresh(); }, 900);
    });
  }, [appointmentId, router, startTransition]);

  function handleCancel() {
    if (busyRef.current || pending) return;
    const confirmed = window.confirm("Vuoi disdire questa prenotazione? L'azione non è reversibile.");
    if (!confirmed) return;

    busyRef.current = true;
    if (btnRef.current) btnRef.current.disabled = true;

    const letters = lettersRef.current.filter(Boolean);

    /* 1. suck letters */
    letters.forEach((letter, i) => {
      setTimeout(() => {
        letter.style.animation = 'hd-suck 0.18s ease-in forwards';
      }, i * 80);
    });

    /* 2. chomp icon */
    setTimeout(() => {
      if (trashRef.current) trashRef.current.style.animation = 'hd-chomp 0.5s ease-in-out';
    }, 30);

    /* 3. progress ring */
    setTimeout(() => {
      if (ringRef.current)  ringRef.current.style.opacity = '1';
      if (circleRef.current) circleRef.current.style.animation = 'hd-ring 0.55s ease-out forwards';
    }, 160);

    /* 4. fire server action */
    setTimeout(() => { doCancel(); }, letters.length * 80 + 220);
  }

  if (!manageable) {
    return (
      <p className="text-xs text-white/40">
        Modifica o disdetta non più disponibile (meno di 30 minuti all&apos;appuntamento)
      </p>
    );
  }

  const word = 'Disdici';

  return (
    <div className="flex flex-wrap gap-2">
      {/* Modifica */}
      <Link
        href={`/area-cliente/appuntamenti/${appointmentId}/modifica`}
        className="inline-flex items-center gap-2 rounded-lg border border-yellow-500/60 bg-yellow-500/15 px-4 py-2 text-sm font-semibold text-yellow-300 transition hover:bg-yellow-500/25"
      >
        <Pencil size={16} />
        Modifica prenotazione
      </Link>

      {/* Hungry Delete cancel button */}
      <button
        ref={btnRef}
        type="button"
        onClick={handleCancel}
        disabled={pending}
        style={{ overflow: 'visible' }}
        className="relative inline-flex items-center gap-2 rounded-lg border border-red-500/60 bg-red-500/15 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/25 disabled:opacity-50"
      >
        {/* Trash + ring + check overlay */}
        <span className="relative" style={{ width: 20, height: 20, flexShrink: 0, display: 'inline-block' }}>
          <svg
            ref={trashRef}
            width="20" height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ display: 'block' }}
          >
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M10 11v6M14 11v6"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>

          {/* Progress ring */}
          <svg
            ref={ringRef}
            width="28" height="28"
            viewBox="0 0 36 36"
            style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%,-50%)',
              opacity: 0, pointerEvents: 'none', transition: 'opacity 0.2s',
            }}
          >
            <circle
              ref={circleRef}
              cx="18" cy="18" r="14"
              fill="none" stroke="#f87171" strokeWidth="3" strokeLinecap="round"
              style={{
                transformOrigin: 'center', transform: 'rotate(-90deg)',
                strokeDasharray: 100, strokeDashoffset: 100,
              }}
            />
          </svg>

          {/* Checkmark */}
          <span
            ref={checkRef}
            style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%,-50%) scale(0)',
              opacity: 0, fontSize: 12, pointerEvents: 'none', lineHeight: 1,
            }}
          >
            ✅
          </span>
        </span>

        {/* Animated letters of "Disdici" */}
        <span style={{ display: 'inline-flex', gap: 0, overflow: 'visible' }}>
          {word.split('').map((char, i) => (
            <span
              key={i}
              ref={(el) => { if (el) lettersRef.current[i] = el; }}
              style={{ display: 'inline-block' }}
            >
              {char}
            </span>
          ))}
          &nbsp;prenotazione
        </span>

        {pending && (
          <span style={{ fontSize: '0.75rem', opacity: 0.7, marginLeft: 2 }}>…</span>
        )}
      </button>
    </div>
  );
}