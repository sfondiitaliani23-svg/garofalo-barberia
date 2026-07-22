'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function ImageProtection() {
  const pathname = usePathname();

  useEffect(() => {
    // 1. Funzione di blocco tasto destro (contextmenu) per tutela privacy
    const handleContextMenu = (e: MouseEvent) => {
      // Se l'utente si trova nella Galleria dell'Area Cliente, permettiamo l'interazione per il download autorizzato
      if (pathname?.startsWith('/area-cliente/galleria')) {
        return;
      }

      const target = e.target as HTMLElement | null;
      if (!target) return;

      const isImageOrMedia =
        target.tagName === 'IMG' ||
        target.tagName === 'VIDEO' ||
        target.tagName === 'PICTURE' ||
        target.tagName === 'CANVAS' ||
        target.tagName === 'SVG' ||
        !!target.querySelector('img') ||
        !!target.closest('img') ||
        !!target.closest('.framed-photo-wrap') ||
        !!target.closest('.service-card-luxury') ||
        !!target.closest('.photo-strip-wrap') ||
        !!target.closest('.galleria-card') ||
        !!target.closest('.perfume-card-front') ||
        !!target.closest('[data-protected-image]');

      if (isImageOrMedia) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    // 2. Funzione di blocco drag and drop / trascinamento immagini
    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      if (
        target.tagName === 'IMG' ||
        target.tagName === 'VIDEO' ||
        target.tagName === 'PICTURE' ||
        !!target.closest('img')
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    // Usiamo il 'capture phase' (true) per intercettare l'evento prima di qualsiasi altro componente
    window.addEventListener('contextmenu', handleContextMenu, true);
    window.addEventListener('dragstart', handleDragStart, true);
    document.addEventListener('contextmenu', handleContextMenu, true);
    document.addEventListener('dragstart', handleDragStart, true);

    // 3. Setta draggable="false" ed elimina menu contestuali nativi direttamente sugli elementi img nel DOM
    const disableImgDrag = () => {
      const images = document.querySelectorAll('img');
      images.forEach((img) => {
        if (!img.hasAttribute('data-protected')) {
          img.setAttribute('draggable', 'false');
          img.setAttribute('data-protected', 'true');
          img.oncontextmenu = (e) => {
            if (!pathname?.startsWith('/area-cliente/galleria')) {
              e.preventDefault();
              return false;
            }
          };
        }
      });
    };

    disableImgDrag();
    const observer = new MutationObserver(disableImgDrag);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu, true);
      window.removeEventListener('dragstart', handleDragStart, true);
      document.removeEventListener('contextmenu', handleContextMenu, true);
      document.removeEventListener('dragstart', handleDragStart, true);
      observer.disconnect();
    };
  }, [pathname]);

  return null;
}
