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
import './install-app.css';

const DISMISS_KEY = 'gb_install_dismissed';
const DISMISS_DAYS = 14;
const DELAY_MS = 2500;

/**
 * Messaggio a comparsa "Installa l'app" appena si apre il sito (solo da telefono).
 * Compare dopo la scelta sui cookie, mai insieme al banner; se chiuso, torna dopo 14 giorni.
 */
export function InstallAppPrompt() {
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
      <button type="button" className="ia-close" onClick={dismiss} aria-label="Chiudi">
        <X size={18} />
      </button>
      <div className="ia-head">
        <Image src="/pwa/icon-192.png" alt="" width={56} height={56} className="ia-icon" />
        <div>
          <p id="ia-title" className="ia-title">Garofalo sul tuo telefono</p>
          <p id="ia-text" className="ia-text">Prenota in un tocco, come un’app. Gratis, senza store, occupa pochissimo spazio.</p>
        </div>
      </div>

      {mode === 'native' ? (
        <div className="ia-actions">
          <button type="button" className="btn-primary ia-btn" onClick={install} data-evt="installa_app">
            Installa l’app
          </button>
          <button type="button" className="ia-later" onClick={dismiss}>
            Non ora
          </button>
        </div>
      ) : (
        <>
          <ol className="ia-steps">
            <li>
              Tocca <Share size={16} aria-label="Condividi" className="ia-inline" /> <strong>Condividi</strong> in basso nella barra di Safari
            </li>
            <li>
              Scegli <SquarePlus size={16} aria-hidden className="ia-inline" /> <strong>Aggiungi alla schermata Home</strong>
            </li>
          </ol>
          <div className="ia-actions">
            <button type="button" className="ia-later" onClick={dismiss}>
              Ho capito
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
  label = 'Installa l’app',
}: {
  className?: string;
  /** Mostra la voce anche quando il browser non offre la finestra automatica (spiega come fare a mano). */
  always?: boolean;
  onAction?: () => void;
  label?: string;
}) {
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
        {label}
      </button>
      {help && (
        <div className="ia-sheet" role="dialog" aria-labelledby="ia-help-title">
          <button type="button" className="ia-close" onClick={() => setHelp(false)} aria-label="Chiudi">
            <X size={18} />
          </button>
          {state === 'ios' ? (
            <>
              <p id="ia-help-title" className="ia-title">Installa l’app su iPhone</p>
              <ol className="ia-steps">
                <li>
                  Tocca <Share size={16} aria-label="Condividi" className="ia-inline" /> <strong>Condividi</strong> in basso nella barra di Safari
                </li>
                <li>
                  Scegli <SquarePlus size={16} aria-hidden className="ia-inline" /> <strong>Aggiungi alla schermata Home</strong>
                </li>
              </ol>
            </>
          ) : (
            <>
              <p id="ia-help-title" className="ia-title">Installa l’app</p>
              <ol className="ia-steps">
                <li>
                  Apri il menu del browser <strong>⋮</strong> in alto a destra
                </li>
                <li>
                  Scegli <strong>Installa app</strong> oppure <strong>Aggiungi a schermata Home</strong>
                </li>
              </ol>
              <p className="ia-text" style={{ marginTop: '0.6rem' }}>
                Se non vedi la voce, apri barberiagarofalo.it con Chrome.
              </p>
            </>
          )}
          <div className="ia-actions">
            <button type="button" className="ia-later" onClick={() => setHelp(false)}>
              Ho capito
            </button>
          </div>
        </div>
      )}
    </>
  );
}
