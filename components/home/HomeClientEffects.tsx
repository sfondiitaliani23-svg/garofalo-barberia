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

    const cards = document.querySelectorAll('.perfume-card-flip');
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    cards.forEach((card) => {
      if (!canHover) {
        card.addEventListener('click', () => {
          const isFlipped = card.classList.contains('is-flipped');
          cards.forEach((other) => other.classList.remove('is-flipped'));
          if (!isFlipped) card.classList.add('is-flipped');
        });
      }
      card.addEventListener('keydown', (event: Event) => {
        const e = event as KeyboardEvent;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          card.classList.toggle('is-flipped');
        }
      });
    });

    if (!canHover) {
      const onDocClick = (event: MouseEvent) => {
        const target = event.target as Element;
        if (!target.closest('.perfume-card-flip')) {
          cards.forEach((card) => card.classList.remove('is-flipped'));
        }
      };
      document.addEventListener('click', onDocClick);
      return () => document.removeEventListener('click', onDocClick);
    }
  }, []);

  return null;
}