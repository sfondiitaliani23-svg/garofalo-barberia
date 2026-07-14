'use client';

import { useEffect, useState } from 'react';
import { ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <button
      onClick={scrollToTop}
      type="button"
      className={cn(
        'fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-5 z-[200]',
        'flex h-10 w-10 items-center justify-center rounded bg-gold text-black shadow-lg transition-all duration-300 hover:bg-gold-light',
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'
      )}
      aria-label="Torna in alto"
    >
      <ChevronUp size={20} strokeWidth={2.5} />
    </button>
  );
}
