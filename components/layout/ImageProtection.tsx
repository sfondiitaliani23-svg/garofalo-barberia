'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { toast } from 'sonner';

export function ImageProtection() {
  const pathname = usePathname();
  const lastToastTimeRef = useRef<number>(0);

  useEffect(() => {
    const isCustomerGallery = pathname?.startsWith('/area-cliente/galleria');

    const showPrivacyNotice = () => {
      const now = Date.now();
      if (now - lastToastTimeRef.current > 2000) {
        lastToastTimeRef.current = now;
        toast.warning('🔒 Immagine e Contenuti Protetti da Privacy', {
          description:
            'Per questioni di riservatezza e diritto d’autore, non è possibile scaricare, copiare o salvare le immagini del sito.',
          duration: 3500,
        });
      }
    };

    // 1. Blocco assoluto e incondizionato di qualsiasi tasto destro sul sito pubblico
    const blockContextMenu = (e: MouseEvent) => {
      if (isCustomerGallery) return;

      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === 'function') {
        e.stopImmediatePropagation();
      }
      showPrivacyNotice();
      return false;
    };

    // 2. Blocco assoluto e incondizionato del drag & drop sul sito pubblico
    const blockDrag = (e: DragEvent) => {
      if (isCustomerGallery) return;

      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === 'function') {
        e.stopImmediatePropagation();
      }
      showPrivacyNotice();
      return false;
    };

    // Binding nativo diretto per massima compatibilità con tutti i browser
    window.oncontextmenu = blockContextMenu;
    window.ondragstart = blockDrag;
    document.oncontextmenu = blockContextMenu;
    document.ondragstart = blockDrag;

    window.addEventListener('contextmenu', blockContextMenu, true);
    window.addEventListener('dragstart', blockDrag, true);
    document.addEventListener('contextmenu', blockContextMenu, true);
    document.addEventListener('dragstart', blockDrag, true);

    // 3. Applicazione attributi rigidi su tutte le immagini del DOM
    const protectAllImages = () => {
      const images = document.querySelectorAll('img, picture, video, canvas, svg');
      images.forEach((img) => {
        img.setAttribute('draggable', 'false');
        img.setAttribute('oncontextmenu', 'return false;');
        if (!isCustomerGallery) {
          img.setAttribute(
            'title',
            'Immagine protetta da privacy e diritto d’autore. Impossibile scaricare.'
          );
        } else {
          img.removeAttribute('title');
        }
        (img as HTMLElement).style.userSelect = 'none';
        (img as HTMLElement).style.setProperty('-webkit-user-drag', 'none');
        (img as HTMLElement).style.setProperty('-webkit-touch-callout', 'none');
      });
    };

    protectAllImages();
    const observer = new MutationObserver(protectAllImages);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.oncontextmenu = null;
      window.ondragstart = null;
      document.oncontextmenu = null;
      document.ondragstart = null;
      window.removeEventListener('contextmenu', blockContextMenu, true);
      window.removeEventListener('dragstart', blockDrag, true);
      document.removeEventListener('contextmenu', blockContextMenu, true);
      document.removeEventListener('dragstart', blockDrag, true);
      observer.disconnect();
    };
  }, [pathname]);

  return null;
}
