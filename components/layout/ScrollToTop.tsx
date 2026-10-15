'use client';

import { useEffect, useState } from 'react';
import { ChevronUp } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useLang } from '@/components/i18n/LangProvider';
import { scrollTopLabel } from '@/lib/i18n/content-widgets';

export function ScrollToTop() {
  const lang = useLang();
  const [isVisible, setIsVisible] = useState(false);
  const pathname = usePathname();
  const isCustomerArea = pathname?.startsWith('/area-cliente') ?? false;

  const [inApp, setInApp] = useState(false);

  useEffect(() => {
    // Nell'app installata il tasto non serve: niente ascolto dello scorrimento
    if (document.documentElement.classList.contains('is-app')) {
      setInApp(true);
      return;
    }
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility, { passive: true });
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  if (inApp) return null;

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
        'scroll-top-btn fixed z-[200] right-8 transition-all duration-300',
        isCustomerArea
          ? 'bottom-[calc(5.5rem+env(safe-area-inset-bottom))] lg:bottom-[calc(1.5rem+env(safe-area-inset-bottom))]'
          : 'bottom-[calc(1.5rem+env(safe-area-inset-bottom))]',
        'flex h-10 w-10 items-center justify-center rounded bg-[#cd9a4f] text-black shadow-lg hover:bg-[#e5b565]',
        isVisible ? 'translate-y-0 opacity-100 animate-in fade-in zoom-in-50' : 'translate-y-10 opacity-0 pointer-events-none'
      )}
      aria-label={scrollTopLabel(lang)}
    >
      <ChevronUp size={20} strokeWidth={2.5} />
    </button>
  );
}
