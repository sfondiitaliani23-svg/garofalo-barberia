'use client';

// Sfondo con vetro liquido dell'accesso (14/11/2026). Vedi lib/utils/liquid-glass.ts.
// Se WebGL manca, la pagina resta come prima (scheda scura con sfocatura CSS).
import { useEffect, useRef } from 'react';

export function LiquidGlassBackdrop({ foto }: { foto: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const area = canvas?.parentElement;
    if (!canvas || !area) return undefined;
    let stop = () => {};
    let vivo = true;
    import('@/lib/utils/liquid-glass')
      .then(({ avviaVetro }) => {
        if (!vivo) return;
        const fine = avviaVetro(canvas, area, foto);
        if (!fine) return;
        stop = fine;
        area.classList.add('is-vetro');
      })
      .catch(() => {});
    return () => {
      vivo = false;
      stop();
      area.classList.remove('is-vetro');
    };
  }, [foto]);
  return <canvas ref={ref} className="vetro-canvas" aria-hidden />;
}
