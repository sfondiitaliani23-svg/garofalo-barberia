'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedDividerProps {
  variant?: 'compact' | 'wide' | 'eyebrow';
  className?: string;
}

export function AnimatedDivider({ variant = 'compact', className }: AnimatedDividerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('is-visible');
        }
      },
      { threshold: 0.25 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (variant === 'eyebrow') {
    return (
      <div ref={ref} className={cn('animated-divider animated-divider-eyebrow', className)} aria-hidden>
        <svg viewBox="0 0 88 20" className="animated-divider-svg-eyebrow">
          <path
            className="animated-divider-stroke animated-divider-stroke-left"
            d="M0 10 C14 5, 28 15, 44 10 S68 5, 72 10"
          />
          <circle className="animated-divider-dot animated-divider-dot-left" cx="66" cy="10" r="2" />
          <rect
            className="animated-divider-gem animated-divider-gem-eyebrow"
            x="74"
            y="7"
            width="10"
            height="10"
            transform="rotate(45 79 12)"
          />
        </svg>
      </div>
    );
  }

  if (variant === 'wide') {
    return (
      <div ref={ref} className={cn('animated-divider animated-divider-wide', className)} aria-hidden>
        <svg viewBox="0 0 1200 48" preserveAspectRatio="none" className="animated-divider-svg">
          <path
            className="animated-divider-stroke animated-divider-stroke-left"
            d="M0 24 C120 8, 240 40, 380 24 S620 8, 560 24"
          />
          <path
            className="animated-divider-stroke animated-divider-stroke-right"
            d="M640 24 C780 40, 900 8, 1040 24 S1200 40, 1200 24"
          />
          <rect
            className="animated-divider-gem"
            x="588"
            y="20"
            width="24"
            height="24"
            transform="rotate(45 600 32)"
          />
          <circle className="animated-divider-dot animated-divider-dot-left" cx="520" cy="24" r="3" />
          <circle className="animated-divider-dot animated-divider-dot-right" cx="680" cy="24" r="3" />
        </svg>
      </div>
    );
  }

  return (
    <div ref={ref} className={cn('animated-divider animated-divider-compact', className)} aria-hidden>
      <svg viewBox="0 0 220 20" className="animated-divider-svg-compact">
        <line className="animated-divider-line animated-divider-line-left" x1="0" y1="10" x2="88" y2="10" />
        <rect
          className="animated-divider-gem animated-divider-gem-compact"
          x="102"
          y="6"
          width="16"
          height="16"
          transform="rotate(45 110 14)"
        />
        <line className="animated-divider-line animated-divider-line-right" x1="132" y1="10" x2="220" y2="10" />
      </svg>
    </div>
  );
}