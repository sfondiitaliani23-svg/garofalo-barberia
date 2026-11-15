'use client';

// Sfondo «fumo d'oro» delle aree riservate (admin, tester, dipendenti, clienti), 15/11/2026, richiesta di Eliseo.
// Stesso shader dell'accesso (lib/utils/liquid-glass.ts), più leggero: risoluzione bassa e 30 fotogrammi al secondo.
// Sopra c'è un velo scuro, così testi e numeri si leggono sempre. Le schede sono di vetro scuro (aree-vetro.css).
// «Luce del cursore»: la scheda sotto il mouse riceve --x/--y e si accende un filo d'oro sul bordo, solo lì.
// Solo grafica: nessuna funzione cambia. Senza WebGL resta lo sfondo scuro con la luce d'oro in CSS.
import { useEffect, useRef } from 'react';

/** Le schede che prendono la luce del cursore (stesso elenco in aree-vetro.css). */
export const SCHEDE_LUCE = '.ov-card, .ov-quick-btn, .app-card, .app-appt, [data-vetro-luce], .rounded-xl.border, .rounded-2xl.border';

export function AreaFumo() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const area = canvas?.closest('.area-vetro') as HTMLElement | null;
    if (!canvas || !area) return undefined;
    let stop = () => {};
    let vivo = true;
    const telefono = matchMedia('(max-width: 820px)').matches;
    import('@/lib/utils/liquid-glass')
      .then(({ avviaVetro }) => {
        if (!vivo) return;
        const fine = avviaVetro(canvas, area, { scala: telefono ? 0.3 : 0.4, fps: telefono ? 24 : 30 });
        if (!fine) return;
        stop = fine;
        area.classList.add('is-fumo');
      })
      .catch(() => {});

    // Luce del cursore sulle schede (solo dove c'è il mouse)
    let accesa: HTMLElement | null = null;
    let attesa = 0;
    let ex = 0, ey = 0, et: EventTarget | null = null;
    const aggiorna = () => {
      attesa = 0;
      const el = (et as Element | null)?.closest?.(SCHEDE_LUCE) as HTMLElement | null;
      if (el !== accesa) { accesa?.removeAttribute('data-luce'); accesa = el; el?.setAttribute('data-luce', ''); }
      if (el) {
        const b = el.getBoundingClientRect();
        el.style.setProperty('--x', `${ex - b.left}px`);
        el.style.setProperty('--y', `${ey - b.top}px`);
      }
    };
    const muovi = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      ex = e.clientX; ey = e.clientY; et = e.target;
      if (!attesa) attesa = requestAnimationFrame(aggiorna);
    };
    const fuori = () => { accesa?.removeAttribute('data-luce'); accesa = null; };
    area.addEventListener('pointermove', muovi, { passive: true });
    area.addEventListener('pointerleave', fuori);
    return () => {
      vivo = false;
      stop();
      cancelAnimationFrame(attesa);
      area.removeEventListener('pointermove', muovi);
      area.removeEventListener('pointerleave', fuori);
      area.classList.remove('is-fumo');
    };
  }, []);

  return (
    <div className="area-fumo" aria-hidden>
      <canvas ref={ref} />
      <div className="area-fumo__velo" />
    </div>
  );
}
