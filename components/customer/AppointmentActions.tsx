'use client';

import { useTransition, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Pencil } from 'lucide-react';
import { cancelAppointment } from '@/lib/actions/bookings';
import { canManageAppointment } from '@/lib/utils/appointments';

const WORD = 'Disdici';

interface AppointmentActionsProps {
  appointmentId: string;
  startsAt: string;
}

type Phase = 'idle' | 'eating' | 'success' | 'error';

export function AppointmentActions({ appointmentId, startsAt }: AppointmentActionsProps) {
  const router = useRouter();
  const [serverPending, startTransition] = useTransition();
  const manageable = canManageAppointment(startsAt);

  const [phase, setPhase] = useState<Phase>('idle');

  // When the last letter finishes animating → fire server action
  function onLastLetterDone() {
    startTransition(async () => {
      const result = await cancelAppointment(appointmentId);
      if (!result.ok) {
        toast.error(result.error);
        setPhase('error');
        setTimeout(() => setPhase('idle'), 600);
        return;
      }
      setPhase('success');
      toast.success('Prenotazione disdetta');
      setTimeout(() => { router.refresh(); }, 950);
    });
  }

  function handleCancel() {
    if (phase !== 'idle' || serverPending) return;
    const ok = window.confirm("Vuoi disdire questa prenotazione? L'azione non è reversibile.");
    if (!ok) return;
    setPhase('eating');
  }

  const isEating  = phase === 'eating';
  const isSuccess = phase === 'success';
  const isError   = phase === 'error';
  const disabled  = phase !== 'idle' || serverPending;

  if (!manageable) {
    return (
      <p className="text-xs text-white/40">
        Modifica o disdetta non più disponibile (meno di 30 minuti all&apos;appuntamento)
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {/* Inline styles — guaranteed available at render time */}
      <style>{`
        @keyframes hd-suck {
          0%   { transform: translateX(0)    scale(1);   opacity: 1; }
          60%  { transform: translateX(-8px) scale(.55); opacity: .5; }
          100% { transform: translateX(-20px) scale(0);  opacity: 0; }
        }
        @keyframes hd-chomp {
          0%,100% { transform: rotate(0deg)  scale(1); }
          25%     { transform: rotate(-10deg) scale(1.22); }
          50%     { transform: rotate(0deg)  scale(1.08); }
          75%     { transform: rotate(8deg)  scale(1.16); }
        }
        @keyframes hd-ring-fill {
          from { stroke-dashoffset: 100; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes hd-check-pop {
          0%   { transform: translate(-50%,-50%) scale(0);   opacity: 0; }
          60%  { transform: translate(-50%,-50%) scale(1.4); opacity: 1; }
          100% { transform: translate(-50%,-50%) scale(1);   opacity: 1; }
        }
        @keyframes hd-shake {
          0%,100% { transform: translateX(0); }
          20% { transform: translateX(-5px); }
          40% { transform: translateX(5px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        .hd-letter {
          display: inline-block;
        }
        .hd-letter.eating {
          animation: hd-suck 0.22s ease-in forwards;
        }
        .hd-trash.eating {
          animation: hd-chomp 0.5s ease-in-out;
        }
        .hd-ring circle.eating {
          animation: hd-ring-fill 0.6s ease-out forwards;
        }
        .hd-checkmark.success {
          animation: hd-check-pop 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards;
        }
        .hd-btn.error {
          animation: hd-shake 0.4s ease;
        }
      `}</style>

      {/* Modifica */}
      <Link
        href={`/area-cliente/appuntamenti/${appointmentId}/modifica`}
        className="inline-flex items-center gap-2 rounded-lg border border-yellow-500/60 bg-yellow-500/15 px-4 py-2 text-sm font-semibold text-yellow-300 transition hover:bg-yellow-500/25"
      >
        <Pencil size={16} />
        Modifica prenotazione
      </Link>

      {/* ── Hungry Delete button ── */}
      <button
        type="button"
        onClick={handleCancel}
        disabled={disabled}
        style={{ overflow: 'visible' }}
        className={`hd-btn${isError ? ' error' : ''} relative inline-flex items-center gap-2 rounded-lg border border-red-500/60 bg-red-500/15 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/25 disabled:opacity-50`}
      >
        {/* Trash + ring + checkmark */}
        <span style={{ position: 'relative', width: 20, height: 20, flexShrink: 0, display: 'inline-block' }}>
          {/* Trash SVG */}
          <svg
            className={`hd-trash${isEating ? ' eating' : ''}`}
            width="20" height="20" viewBox="0 0 24 24" fill="none"
            style={{ display: 'block' }}
          >
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M10 11v6M14 11v6"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>

          {/* Progress ring — only mounted while eating/success */}
          {(isEating || isSuccess) && (
            <svg
              className="hd-ring"
              width="30" height="30" viewBox="0 0 36 36"
              style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%,-50%)',
                pointerEvents: 'none',
              }}
            >
              <circle
                cx="18" cy="18" r="14"
                fill="none" stroke="#f87171" strokeWidth="3" strokeLinecap="round"
                className={isEating ? 'eating' : ''}
                style={{
                  transformOrigin: 'center',
                  transform: 'rotate(-90deg)',
                  strokeDasharray: '100',
                  strokeDashoffset: isSuccess ? '0' : '100',
                }}
              />
            </svg>
          )}

          {/* Checkmark */}
          {isSuccess && (
            <span
              className="hd-checkmark success"
              style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%,-50%) scale(0)',
                opacity: 0, fontSize: 13, pointerEvents: 'none', lineHeight: 1,
              }}
            >✅</span>
          )}
        </span>

        {/* "Disdici" — letters animate one by one, last triggers server action */}
        <span style={{ display: 'inline-flex', alignItems: 'center', overflow: 'visible' }}>
          {WORD.split('').map((char, i) => {
            const isLast = i === WORD.length - 1;
            return (
              <span
                key={i}
                className={`hd-letter${isEating ? ' eating' : ''}`}
                style={isEating ? { animationDelay: `${i * 75}ms` } : undefined}
                onAnimationEnd={isLast && isEating ? onLastLetterDone : undefined}
              >{char}</span>
            );
          })}
          <span>&nbsp;prenotazione</span>
        </span>

        {serverPending && <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>…</span>}
      </button>
    </div>
  );
}