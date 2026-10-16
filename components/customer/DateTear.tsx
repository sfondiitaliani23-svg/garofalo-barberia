import { format, parseISO } from 'date-fns';
import { dfLocale } from '@/lib/i18n/content-booking';
import type { Lang } from '@/lib/i18n';

/** Tagliando oro con giorno della settimana, numero e mese (solo grafica). */
export function DateTear({ startsAt, lang, muted = false }: { startsAt: string; lang: Lang; muted?: boolean }) {
  const d = parseISO(startsAt);
  const locale = dfLocale(lang);
  return (
    <div
      className={`flex w-20 shrink-0 flex-col items-center justify-center py-3 ${
        muted ? 'bg-gold/20 text-gold' : 'bg-gold text-[#0a0807]'
      }`}
    >
      <span className="text-[10px] font-bold uppercase tracking-[0.25em]">{format(d, 'EEE', { locale })}</span>
      <span className="font-display text-3xl leading-tight">{format(d, 'd')}</span>
      <span className="text-[10px] font-bold uppercase tracking-[0.25em]">{format(d, 'MMM', { locale })}</span>
    </div>
  );
}
