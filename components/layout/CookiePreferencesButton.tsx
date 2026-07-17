'use client';

export function CookiePreferencesButton() {
  return (
    <button
      type="button"
      onClick={() => {
        localStorage.removeItem('garofalo_cookie_consent');
        window.dispatchEvent(new CustomEvent('garofalo:cookie-consent'));
      }}
      className="hover:text-gold-light underline bg-transparent border-none p-0 cursor-pointer text-xs text-white/40 font-medium"
    >
      Preferenze Cookie
    </button>
  );
}
