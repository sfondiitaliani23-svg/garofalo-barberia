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
      if (now - lastToastTimeRef.current > 2500) {
        lastToastTimeRef.current = now;
        toast.warning('🔒 Immagine Protetta da Privacy', {
          description: 'Per questioni di privacy e diritto d’autore, non è possibile scaricare o interagire con questa immagine.',
          duration: 3500,
        });
      }
    };

    // 1. Blocco del menu contestuale (tasto destro) con notifica informativa
    const blockContextMenu = (e: MouseEvent) => {
      if (isCustomerGallery) return;

      const target = e.target as HTMLElement | null;
      const isImageRelated =
        target &&
        (target.tagName === 'IMG' ||
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
          !!target.closest('[data-protected-image]'));

      if (isImageRelated) {
        e.preventDefault();
        e.stopPropagation();
        showPrivacyNotice();
        return false;
      }
    };

    // 2. Blocco del trascinamento (drag and drop) con notifica informativa
    const blockDrag = (e: DragEvent) => {
      if (isCustomerGallery) return;

      const target = e.target as HTMLElement | null;
      const isImageRelated =
        target &&
        (target.tagName === 'IMG' ||
          target.tagName === 'VIDEO' ||
          target.tagName === 'PICTURE' ||
          !!target.closest('img'));

      if (isImageRelated) {
        e.preventDefault();
        e.stopPropagation();
        showPrivacyNotice();
        return false;
      }
    };

    window.addEventListener('contextmenu', blockContextMenu, true);
    window.addEventListener('dragstart', blockDrag, true);
    document.addEventListener('contextmenu', blockContextMenu, true);
    document.addEventListener('dragstart', blockDrag, true);

    // 3. Applicazione attributi e tooltip informativi su tutte le foto
    const protectAllImages = () => {
      const images = document.querySelectorAll('img, picture, video');
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
      window.removeEventListener('contextmenu', blockContextMenu, true);
      window.removeEventListener('dragstart', blockDrag, true);
      document.removeEventListener('contextmenu', blockContextMenu, true);
      document.removeEventListener('dragstart', blockDrag, true);
      observer.disconnect();
    };
  }, [pathname]);

  return null;
}
