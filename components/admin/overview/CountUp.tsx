'use client';

import { useEffect, useRef, useState } from 'react';
import { leggiNumero, testoAlPasso } from '@/lib/utils/count-up';

/** Il numero sale da 0 al valore vero in 0,6 s, solo la prima volta che la scheda compare. Fermo con movimento ridotto. */
export default function CountUp({ value }: { value: string }) {
  const [testo, setTesto] = useState(value);
  const fatto = useRef(false);

  useEffect(() => {
    if (fatto.current) { setTesto(value); return; }
    fatto.current = true;
    const n = leggiNumero(value);
    if (!n || n.valore === 0 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setTesto(value); return; }
    const t0 = performance.now();
    let id = 0;
    const passo = (t: number) => {
      const k = Math.min(1, (t - t0) / 600);
      setTesto(testoAlPasso(value, n, k));
      if (k < 1) id = requestAnimationFrame(passo);
    };
    id = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(id);
  }, [value]);

  return <>{testo}</>;
}
