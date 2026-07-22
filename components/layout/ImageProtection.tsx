'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function ImageProtection() {
  const pathname = usePathname();

  useEffect(() => {
    const isCustomerGallery = pathname?.startsWith('/area-cliente/galleria');

    // 1. Blocco del menu contestuale (tasto destro)
    const blockContextMenu = (e: MouseEvent) => {
      if (isCustomerGallery) return;

      // Su tutte le pagine pubbliche, blocca tassativamente il tasto destro
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    // 2. Blocco del trascinamento (drag and drop)
    const blockDrag = (e: DragEvent) => {
      if (isCustomerGallery) return;
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    // Assegnazione globale diretta
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
      const images = document.querySelectorAll('img, picture, video');
      images.forEach((img) => {
        img.setAttribute('draggable', 'false');
        img.setAttribute('oncontextmenu', 'return false;');
        if (!isCustomerGallery) {
          (img as HTMLElement).style.pointerEvents = 'none';
        } else {
          (img as HTMLElement).style.pointerEvents = 'auto';
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
