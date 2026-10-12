'use client';

import { useEffect, useState } from 'react';
import { Fingerprint, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type Item = { id: string; name: string; createdAt: number };

function guessDeviceName() {
  const ua = navigator.userAgent;
  if (/iPhone/i.test(ua)) return 'iPhone';
  if (/iPad/i.test(ua)) return 'iPad';
  if (/Android/i.test(ua)) return 'Android';
  if (/Mac OS X/i.test(ua)) return 'Mac';
  if (/Windows/i.test(ua)) return 'Windows';
  return 'Dispositivo';
}

export function PasskeyManager() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [supported, setSupported] = useState(true);

  async function load() {
    const { myPasskeys } = await import('@/lib/actions/passwordless');
    setItems(await myPasskeys());
  }

  useEffect(() => {
    import('@simplewebauthn/browser').then(({ browserSupportsWebAuthn }) => setSupported(browserSupportsWebAuthn()));
    void load();
  }, []);

  async function add() {
    setBusy(true);
    try {
      const { startRegistration } = await import('@simplewebauthn/browser');
      const { passkeyRegistrationOptions, passkeyRegistrationVerify } = await import('@/lib/actions/passwordless');
      const opts = await passkeyRegistrationOptions();
      if (!opts.ok) {
        toast.error(opts.error);
        return;
      }
      const attestation = await startRegistration({ optionsJSON: opts.options });
      const res = await passkeyRegistrationVerify(attestation, guessDeviceName());
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success('Passkey attivata. Dal prossimo accesso usa "Passkey".');
      await load();
    } catch (err) {
      const name = (err as { name?: string })?.name;
      toast.error(
        name === 'InvalidStateError'
          ? 'Su questo dispositivo la Passkey è già attiva.'
          : name === 'NotAllowedError'
          ? 'Operazione annullata.'
          : 'Attivazione non riuscita.'
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Rimuovere questa Passkey? Dovrai riattivarla per usarla di nuovo.')) return;
    const { removeMyPasskey } = await import('@/lib/actions/passwordless');
    const res = await removeMyPasskey(id);
    if (!res.ok) toast.error(res.error);
    await load();
  }

  return (
    <section className="mt-10 rounded-xl border border-white/10 bg-[#0e0e0e] p-5" aria-labelledby="pk-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gold/10 text-gold">
            <Fingerprint size={20} aria-hidden />
          </span>
          <div>
            <h2 id="pk-title" className="font-semibold text-white">
              Accesso rapido con Passkey
            </h2>
            <p className="mt-0.5 max-w-md text-sm text-white/55">
              Entra con impronta, volto o PIN del telefono, senza password. Attivala una volta su ogni dispositivo che usi.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={add}
          disabled={busy || !supported}
          className="inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2 text-sm font-semibold text-black transition hover:bg-gold-light disabled:opacity-40"
        >
          {busy && <Loader2 size={14} className="animate-spin" aria-hidden />}
          Attiva su questo dispositivo
        </button>
      </div>
      {!supported && <p className="mt-3 text-xs text-amber-300">Questo browser non supporta le Passkey.</p>}
      <ul className="mt-4 space-y-2">
        {items === null ? (
          <li className="text-xs text-white/40">Caricamento...</li>
        ) : items.length === 0 ? (
          <li className="text-xs text-white/40">Nessuna Passkey attiva.</li>
        ) : (
          items.map((p) => (
            <li key={p.id} className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-sm">
              <span className="text-white/80">
                {p.name}
                <span className="ml-2 text-xs text-white/40">
                  dal {new Date(p.createdAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </span>
              <button type="button" onClick={() => remove(p.id)} className="rounded-md p-1.5 text-red-400/80 hover:bg-red-500/10 hover:text-red-400" aria-label={`Rimuovi Passkey ${p.name}`}>
                <Trash2 size={14} />
              </button>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
