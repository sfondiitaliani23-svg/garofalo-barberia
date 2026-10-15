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
          className="cursor-not-allowed rounded-lg border border-white/5 bg-white/[0.02] py-2.5 text-center text-sm font-medium text-white/60"
          aria-disabled
        >
          {time}
        </div>
      ))}
    </div>
  );
}