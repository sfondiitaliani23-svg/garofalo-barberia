'use client';

import { useEffect } from 'react';

export function ImageProtection() {
  useEffect(() => {
    // Previene il tasto destro sulle immagini per tutela della privacy
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'IMG' ||
        target.tagName === 'VIDEO' ||
        target.tagName === 'PICTURE' ||
        target.closest('img') ||
        target.closest('.protected-image')
      ) {
        e.preventDefault();
      }
    };

    // Previene il trascinamento/drag and drop delle immagini sul desktop o in altre schede
    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'IMG' ||
        target.tagName === 'VIDEO' ||
        target.tagName === 'PICTURE' ||
        target.closest('img')
      ) {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('dragstart', handleDragStart);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('dragstart', handleDragStart);
    };
  }, []);

  return null;
}
