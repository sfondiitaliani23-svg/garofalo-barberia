'use client';

import { useLang } from '@/components/i18n/LangProvider';
import { L } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export function InactiveTimeSlotGrid({
  slots,
  className,
}: {
  slots: string[];
  className?: string;
}) {
  const lang = useLang();
  if (slots.length === 0) return null;

  return (
    <div
      className={cn(
        'grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6',
        className
      )}
      aria-label={L(lang, 'Orari non disponibili', 'Unavailable times')}
    >
      {slots.map((time) => (
        <div
          key={time}
          className="cursor-not-allowed border-2 border-gold/10 bg-white/[0.02] py-2.5 text-center text-[15px] font-medium tracking-wide text-white/40 line-through"
          aria-disabled
        >
          {time}
        </div>
      ))}
    </div>
  );
}