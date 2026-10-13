'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  children: React.ReactNode;
  className?: string;
  /** Cambia quando cambia la foto: lo zoom torna a 1. */
  resetKey?: string;
  /** Avvisa il genitore se la foto è ingrandita (per non cambiare foto con lo scorrimento). */
  onZoomChange?: (zoomed: boolean) => void;
};

/**
 * Ingrandimento con due dita (e doppio tocco) solo sulla foto,
 * non sull'intera pagina. Funziona anche nell'app installata,
 * dove lo zoom della pagina è bloccato.
 */
export function PinchZoom({ children, className, resetKey, onZoomChange }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [t, setT] = useState({ s: 1, x: 0, y: 0 });
  const state = useRef({ s: 1, x: 0, y: 0 });
  const gesture = useRef<{ dist: number; s: number; cx: number; cy: number; x: number; y: number } | null>(null);
  const pan = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const lastTap = useRef(0);

  const apply = (n: { s: number; x: number; y: number }) => {
    const s = Math.min(4, Math.max(1, n.s));
    const el = ref.current;
    const w = el?.clientWidth ?? 0;
    const h = el?.clientHeight ?? 0;
    const maxX = ((s - 1) * w) / 2;
    const maxY = ((s - 1) * h) / 2;
    const next = s === 1 ? { s: 1, x: 0, y: 0 } : { s, x: Math.max(-maxX, Math.min(maxX, n.x)), y: Math.max(-maxY, Math.min(maxY, n.y)) };
    const wasZoomed = state.current.s > 1;
    state.current = next;
    setT(next);
    if (wasZoomed !== next.s > 1) onZoomChange?.(next.s > 1);
  };

  useEffect(() => {
    apply({ s: 1, x: 0, y: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const dist = (a: Touch, b: Touch) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

    const start = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const [a, b] = [e.touches[0], e.touches[1]];
        gesture.current = { dist: dist(a, b), s: state.current.s, cx: (a.clientX + b.clientX) / 2, cy: (a.clientY + b.clientY) / 2, x: state.current.x, y: state.current.y };
        pan.current = null;
        e.preventDefault();
      } else if (e.touches.length === 1) {
        const now = Date.now();
        if (now - lastTap.current < 280) {
          // doppio tocco: ingrandisce o torna normale
          apply(state.current.s > 1 ? { s: 1, x: 0, y: 0 } : { s: 2.5, x: 0, y: 0 });
          lastTap.current = 0;
          e.preventDefault();
          return;
        }
        lastTap.current = now;
        if (state.current.s > 1) {
          pan.current = { px: e.touches[0].clientX, py: e.touches[0].clientY, x: state.current.x, y: state.current.y };
          e.stopPropagation();
        }
      }
    };
    const move = (e: TouchEvent) => {
      if (gesture.current && e.touches.length === 2) {
        const [a, b] = [e.touches[0], e.touches[1]];
        const g = gesture.current;
        const cx = (a.clientX + b.clientX) / 2;
        const cy = (a.clientY + b.clientY) / 2;
        apply({ s: g.s * (dist(a, b) / g.dist), x: g.x + (cx - g.cx), y: g.y + (cy - g.cy) });
        e.preventDefault();
      } else if (pan.current && e.touches.length === 1) {
        const p = pan.current;
        apply({ s: state.current.s, x: p.x + (e.touches[0].clientX - p.px), y: p.y + (e.touches[0].clientY - p.py) });
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const end = (e: TouchEvent) => {
      const wasGesture = !!gesture.current || !!pan.current;
      if (e.touches.length < 2) gesture.current = null;
      if (e.touches.length === 0) pan.current = null;
      if (wasGesture || state.current.s > 1) e.stopPropagation();
    };

    el.addEventListener('touchstart', start, { passive: false });
    el.addEventListener('touchmove', move, { passive: false });
    el.addEventListener('touchend', end);
    el.addEventListener('touchcancel', end);
    return () => {
      el.removeEventListener('touchstart', start);
      el.removeEventListener('touchmove', move);
      el.removeEventListener('touchend', end);
      el.removeEventListener('touchcancel', end);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={ref} data-zoom className={className} style={{ touchAction: 'none', overflow: 'hidden' }}>
      <div
        style={{
          width: '100%',
          height: '100%',
          transform: `translate3d(${t.x}px, ${t.y}px, 0) scale(${t.s})`,
          transition: gesture.current || pan.current ? 'none' : 'transform 0.2s ease-out',
          position: 'relative',
        }}
      >
        {children}
      </div>
    </div>
  );
}
