'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { toast } from 'sonner';

/**
 * Protezione immagini leggera: tasto destro e trascinamento bloccati con due soli
 * ascoltatori sul documento; il resto (niente trascinamento, niente menu "salva"
 * su telefono) lo fa il CSS della classe html.img-protect.
 * Prima un MutationObserver ricontrollava tutte le immagini e le icone a ogni
 * cambiamento della pagina: sui telefoni rallentava molto l'app.
 */
export function ImageProtection() {
  const pathname = usePathname();
  const lastToastTimeRef = useRef<number>(0);

  useEffect(() => {
    const isCustomerGallery = pathname?.startsWith('/area-cliente/galleria') ?? false;
    const root = document.documentElement;
    root.classList.toggle('img-protect', !isCustomerGallery);
    if (isCustomerGallery) return;

    const notice = () => {
      const now = Date.now();
      if (now - lastToastTimeRef.current < 2000) return;
      lastToastTimeRef.current = now;
      toast.warning('🔒 Immagine e Contenuti Protetti da Privacy', {
        description:
          'Per questioni di riservatezza e diritto d’autore, non è possibile scaricare, copiare o salvare le immagini del sito.',
        duration: 3500,
      });
    };

    const block = (e: Event) => {
      e.preventDefault();
      notice();
    };

    document.addEventListener('contextmenu', block, true);
    document.addEventListener('dragstart', block, true);
    return () => {
      document.removeEventListener('contextmenu', block, true);
      document.removeEventListener('dragstart', block, true);
    };
  }, [pathname]);

  return null;
}
