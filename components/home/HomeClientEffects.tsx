'use client';

import { useEffect } from 'react';

export function HomeClientEffects() {
  useEffect(() => {
    const items = document.querySelectorAll('.photo-strip-item');
    items.forEach((item) => {
      const activate = () => {
        item.classList.remove('border-out');
        item.classList.add('border-in');
      };
      const deactivate = () => {
        item.classList.remove('border-in');
        item.classList.add('border-out');
      };
      item.addEventListener('mouseenter', activate);
      item.addEventListener('mouseleave', deactivate);
      item.addEventListener('focus', activate);
      item.addEventListener('blur', deactivate);
    });

  }, []);

  return null;
}