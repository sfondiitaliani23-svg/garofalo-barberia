'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { useLang } from '@/components/i18n/LangProvider';
import { imageProtectionText } from '@/lib/i18n/content-widgets';

/**
 * Protezione immagini leggera: tasto destro e trascinamento bloccati con due soli
 * ascoltatori sul documento; il resto (niente trascinamento, niente menu "salva"
 * su telefono) lo fa il CSS della classe html.img-protect.
 * Prima un MutationObserver ricontrollava tutte le immagini e le icone a ogni
 * cambiamento della pagina: sui telefoni rallentava molto l'app.
 */
export function ImageProtection() {
  const pathname = usePathname();
  const lang = useLang();
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
      const txt = imageProtectionText(lang);
      toast.warning(txt.title, {
        description: txt.description,
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
  }, [pathname, lang]);

  return null;
}
