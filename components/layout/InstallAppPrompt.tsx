'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Share, SquarePlus, X } from 'lucide-react';
import { storageGet, storageSet } from '@/lib/utils/safe-storage';
import { hasCookieConsentDecision } from '@/lib/consent/cookie-consent';
import {
  canPromptNative,
  isIOS,
  isInAppBrowser,
  isStandalone,
  onInstallChange,
  promptNativeInstall,
  startInstallListener,
} from '@/lib/utils/install-app';
import { useLang } from '@/components/i18n/LangProvider';
import { installText } from '@/lib/i18n/content-widgets';
import './install-app.css';

const DISMISS_KEY = 'gb_install_dismissed';
const DISMISS_DAYS = 14;
const DELAY_MS = 2500;

/**
 * Messaggio a comparsa "Installa l'app" appena si apre il sito (solo da telefono).
 * Compare dopo la scelta sui cookie, mai insieme al banner; se chiuso, torna dopo 14 giorni.
 */
export function InstallAppPrompt() {
  const t = installText(useLang());
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'native' | 'ios' | null>(null);

  useEffect(() => {
    startInstallListener();
    if (isStandalone() || isInAppBrowser()) return;
    if (window.location.pathname.startsWith('/admin')) return;
    const mobile = window.matchMedia('(max-width: 900px), (pointer: coarse)').matches;
    if (!mobile) return;
    const last = Number(storageGet(DISMISS_KEY) ?? 0);
    if (Date.now() - last < DISMISS_DAYS * 86_400_000) return;

    let timer: number | undefined;
    const tryOpen = () => {
      if (!hasCookieConsentDecision()) return; // prima il banner cookie
      const m = canPromptNative() ? 'native' : isIOS() ? 'ios' : null;
      if (!m) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        setMode(canPromptNative() ? 'native' : isIOS() ? 'ios' : null);
        setOpen(true);
      }, DELAY_MS);
    };
    tryOpen();
    const off = onInstallChange(tryOpen);
    window.addEventListener('garofalo:cookie-consent', tryOpen);
    return () => {
      window.clearTimeout(timer);
      off();
      window.removeEventListener('garofalo:cookie-consent', tryOpen);
    };
  }, []);

  function dismiss() {
    storageSet(DISMISS_KEY, String(Date.now()));
    setOpen(false);
  }

  async function install() {
    const ok = await promptNativeInstall();
    storageSet(DISMISS_KEY, String(Date.now()));
    setOpen(false);
    if (ok) storageSet('gb_install_done', '1');
  }

  if (!open || !mode) return null;

  return (
    <div className="ia-sheet" role="dialog" aria-labelledby="ia-title" aria-describedby="ia-text">
      <button type="button" className="ia-close" onClick={dismiss} aria-label={t.close}>
        <X size={18} />
      </button>
      <div className="ia-head">
        <Image src="/pwa/icon-192.png" alt="" width={56} height={56} className="ia-icon" />
        <div>
          <p id="ia-title" className="ia-title">{t.title}</p>
          <p id="ia-text" className="ia-text">{t.text}</p>
        </div>
      </div>

      {mode === 'native' ? (
        <div className="ia-actions">
          <button type="button" className="btn-primary ia-btn" onClick={install} data-evt="installa_app">
            {t.install}
          </button>
          <button type="button" className="ia-later" onClick={dismiss}>
            {t.notNow}
          </button>
        </div>
      ) : (
        <>
          <ol className="ia-steps">
            <li>
              {t.tapShare1} <Share size={16} aria-label={t.share} className="ia-inline" /> <strong>{t.share}</strong> {t.tapShare2}
            </li>
            <li>
              {t.choose} <SquarePlus size={16} aria-hidden className="ia-inline" /> <strong>{t.addHome}</strong>
            </li>
          </ol>
          <div className="ia-actions">
            <button type="button" className="ia-later" onClick={dismiss}>
              {t.gotIt}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/** Pulsante fisso "Installa l'app" (footer): visibile solo quando l'installazione è possibile. */
export function InstallAppButton({
  className = '',
  always = false,
  onAction,
  label,
}: {
  className?: string;
  /** Mostra la voce anche quando il browser non offre la finestra automatica (spiega come fare a mano). */
  always?: boolean;
  onAction?: () => void;
  label?: string;
}) {
  const t = installText(useLang());
  const [state, setState] = useState<'hidden' | 'native' | 'ios' | 'generic'>('hidden');
  const [help, setHelp] = useState(false);

  useEffect(() => {
    startInstallListener();
    const sync = () => {
      if (isStandalone() || isInAppBrowser()) return setState('hidden');
      setState(canPromptNative() ? 'native' : isIOS() ? 'ios' : always ? 'generic' : 'hidden');
    };
    sync();
    return onInstallChange(sync);
  }, [always]);

  if (state === 'hidden') return null;
  return (
    <>
      <button
        type="button"
        data-evt="installa_app"
        className={className}
        onClick={async () => {
          if (state === 'native') {
            onAction?.();
            await promptNativeInstall();
          } else setHelp(true);
        }}
      >
        {label ?? t.install}
      </button>
      {help && (
        <div className="ia-sheet" role="dialog" aria-labelledby="ia-help-title">
          <button type="button" className="ia-close" onClick={() => setHelp(false)} aria-label={t.close}>
            <X size={18} />
          </button>
          {state === 'ios' ? (
            <>
              <p id="ia-help-title" className="ia-title">{t.iosTitle}</p>
              <ol className="ia-steps">
                <li>
                  {t.tapShare1} <Share size={16} aria-label={t.share} className="ia-inline" /> <strong>{t.share}</strong> {t.tapShare2}
                </li>
                <li>
                  {t.choose} <SquarePlus size={16} aria-hidden className="ia-inline" /> <strong>{t.addHome}</strong>
                </li>
              </ol>
            </>
          ) : (
            <>
              <p id="ia-help-title" className="ia-title">{t.install}</p>
              <ol className="ia-steps">
                <li>
                  {t.menuOpen1} <strong>⋮</strong> {t.menuOpen2}
                </li>
                <li>
                  {t.choose} <strong>{t.installApp}</strong> {t.or} <strong>{t.addHomeAlt}</strong>
                </li>
              </ol>
              <p className="ia-text" style={{ marginTop: '0.6rem' }}>
                {t.noEntry}
              </p>
            </>
          )}
          <div className="ia-actions">
            <button type="button" className="ia-later" onClick={() => setHelp(false)}>
              {t.gotIt}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
