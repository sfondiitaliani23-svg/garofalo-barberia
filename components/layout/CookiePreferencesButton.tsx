'use client';

import { useLang } from '@/components/i18n/LangProvider';
import { L } from '@/lib/i18n';
import { storageRemove } from '@/lib/utils/safe-storage';

export function CookiePreferencesButton() {
  const lang = useLang();
  return (
    <button
      type="button"
      onClick={() => {
        storageRemove('garofalo_cookie_consent');
        window.dispatchEvent(new CustomEvent('garofalo:cookie-consent'));
      }}
      className="hover:text-gold-light underline bg-transparent border-none p-0 cursor-pointer text-xs text-white/60 font-medium"
    >
      {L(lang, 'Preferenze Cookie', 'Cookie preferences')}
    </button>
  );
}
