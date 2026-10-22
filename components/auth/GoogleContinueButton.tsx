'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { signInWithGoogleCredential, signInWithOAuth } from '@/lib/actions/auth';
import { GOOGLE_CLIENT_ID } from '@/lib/auth/google-client';
import { Button } from '@/components/ui/button';

const GSI_SRC = 'https://accounts.google.com/gsi/client';
const ROW_BTN = 'login-alt-btn';
const STACK_BTN =
  'w-full bg-[#161616] hover:bg-white/5 border-white/10 hover:border-gold/30 transition-all duration-300 py-6 text-sm font-medium';

type GoogleAccounts = {
  id: {
    initialize: (config: Record<string, unknown>) => void;
    renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
  };
};

declare global {
  interface Window {
    google?: { accounts: GoogleAccounts };
  }
}

function randomNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function loadGsi() {
  if (window.google?.accounts?.id) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const found = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`);
    if (found) {
      found.addEventListener('load', () => resolve(), { once: true });
      found.addEventListener('error', () => reject(new Error('gsi')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = GSI_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('gsi'));
    document.head.appendChild(script);
  });
}

function safeNext(value: string) {
  return value.startsWith('/') && !value.startsWith('//') ? value : '/area-cliente/dashboard';
}

export function GoogleContinueButton({
  redirectTo,
  label,
  openingLabel,
  icon,
  row = false,
}: {
  redirectTo: string;
  label: string;
  openingLabel: string;
  icon: ReactNode;
  row?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const hitRef = useRef<HTMLDivElement>(null);
  const redirectRef = useRef(redirectTo);
  const openingRef = useRef(openingLabel);
  redirectRef.current = redirectTo;
  openingRef.current = openingLabel;
  const [mode, setMode] = useState<'pending' | 'site' | 'redirect'>('pending');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    const raw = randomNonce();

    (async () => {
      const hashed = await sha256Hex(raw);
      await loadGsi();
      if (cancelled || !hitRef.current || !window.google?.accounts?.id) return;
      const hit = hitRef.current;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        nonce: hashed,
        auto_select: false,
        itp_support: true,
        use_fedcm_for_prompt: true,
        callback: async (response: { credential?: string }) => {
          if (!response.credential) return;
          setMessage(openingRef.current);
          const result = await signInWithGoogleCredential(response.credential, raw);
          if (result && 'error' in result) {
            setMessage(result.error);
            return;
          }
          window.location.assign(safeNext(redirectRef.current));
        },
      });
      const width = Math.max(Math.round(hit.getBoundingClientRect().width) || 240, 200);
      window.google.accounts.id.renderButton(hit, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'pill',
        width,
      });
      const ready = await new Promise<boolean>((resolve) => {
        const start = Date.now();
        const tick = () => {
          if (cancelled) return;
          const frame = hit.querySelector('iframe');
          if (frame && frame.offsetWidth >= 20) { resolve(true); return; }
          if (Date.now() - start >= 1600) { resolve(false); return; }
          window.setTimeout(tick, 200);
        };
        tick();
      });
      if (!cancelled) setMode(ready ? 'site' : 'redirect');
    })().catch(() => {
      if (!cancelled) setMode('redirect');
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const buttonClass = row ? ROW_BTN : undefined;

  return (
    <form action={signInWithOAuth} ref={formRef} className={row ? 'login-google' : 'login-google login-google--stack'}>
      <input type="hidden" name="provider" value="google" />
      <input type="hidden" name="redirect" value={redirectTo} />
      {row ? (
        <button
          type={mode === 'redirect' ? 'submit' : 'button'}
          className={buttonClass}
          disabled={mode === 'pending'}
          tabIndex={mode === 'site' ? -1 : 0}
          aria-hidden={mode === 'site' ? true : undefined}
          data-provider="google"
        >
          {icon}
          {label}
        </button>
      ) : (
        <Button
          type={mode === 'redirect' ? 'submit' : 'button'}
          variant="outline"
          className={STACK_BTN}
          disabled={mode === 'pending'}
          tabIndex={mode === 'site' ? -1 : 0}
          aria-hidden={mode === 'site' ? true : undefined}
        >
          {icon}
          {label}
        </Button>
      )}
      <div ref={hitRef} className={mode === 'site' ? 'login-google__hit is-on' : 'login-google__hit'} />
      {message ? (
        <p className="login-google__status" role="status">
          {message}
        </p>
      ) : null}
    </form>
  );
}
