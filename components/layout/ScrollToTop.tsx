'use client';

import { useEffect, useState } from 'react';
import { ChevronUp } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);
  const pathname = usePathname();
  const isCustomerArea = pathname?.startsWith('/area-cliente') ?? false;

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
        'fixed z-[200] right-8 transition-all duration-300',
        isCustomerArea
          ? 'bottom-[calc(5.5rem+env(safe-area-inset-bottom))] lg:bottom-[calc(1.5rem+env(safe-area-inset-bottom))]'
          : 'bottom-[calc(1.5rem+env(safe-area-inset-bottom))]',
        'flex h-10 w-10 items-center justify-center rounded bg-[#cd9a4f] text-black shadow-lg hover:bg-[#e5b565]',
        isVisible ? 'translate-y-0 opacity-100 animate-in fade-in zoom-in-50' : 'translate-y-10 opacity-0 pointer-events-none'
      )}
      aria-label="Torna in alto"
    >
      <ChevronUp size={20} strokeWidth={2.5} />
    </button>
  );
}
