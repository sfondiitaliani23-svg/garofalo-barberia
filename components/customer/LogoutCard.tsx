'use client';

import { LogOut } from 'lucide-react';
import { signOut } from '@/lib/actions/auth';
import { useLang } from '@/components/i18n/LangProvider';
import { L } from '@/lib/i18n';

export function LogoutCard() {
  const lang = useLang();
  return (
    <form action={signOut}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-gold/35 px-1 py-4">
        <span className="text-sm text-[#bda980]">
          {lang === 'en' ? 'All done? Log out of your private area.' : <>Hai finito? Esci dal tuo spazio riservato.</>}
        </span>
        <button
          type="submit"
          aria-label={L(lang, 'Esci dall\'account', 'Log out of your account')}
          className="inline-flex items-center gap-2 border border-gold/60 px-6 py-2.5 text-[11px] font-bold uppercase tracking-[0.25em] text-gold transition-colors hover:bg-gold hover:text-[#0a0807]"
        >
          <LogOut size={14} aria-hidden />
          {L(lang, 'Esci', 'Log out')}
        </button>
      </div>
    </form>
  );
}
