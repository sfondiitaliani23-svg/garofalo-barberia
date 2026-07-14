import { cn } from '@/lib/utils';

export function InactiveTimeSlotGrid({
  slots,
  className,
}: {
  slots: string[];
  className?: string;
}) {
  if (slots.length === 0) return null;

  return (
    <div
      className={cn(
        'grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6',
        className
      )}
      aria-label="Orari non disponibili"
    >
      {slots.map((time) => (
        <div
          key={time}
          className="cursor-not-allowed rounded-lg border border-white/5 bg-white/[0.02] py-2.5 text-center text-sm font-medium text-white/25"
          aria-disabled
        >
          {time}
        </div>
      ))}
    </div>
  );
}