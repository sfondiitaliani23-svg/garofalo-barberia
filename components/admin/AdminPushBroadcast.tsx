'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import type { BroadcastLog } from '@/lib/utils/push';

const LINKS = [
  { url: '/prenota', label: 'Prenota' },
  { url: '/offerte', label: 'Offerte' },
  { url: '/servizi', label: 'Servizi' },
  { url: '/journal', label: 'Journal' },
  { url: '/contatti', label: 'Contatti e orari' },
  { url: '/', label: 'Home' },
];

const IDEAS = [
  { title: 'Chiusura straordinaria', body: 'Sabato il salone resta chiuso. Prenota ora il tuo posto per la settimana prossima.', url: '/prenota' },
  { title: 'Nuova offerta', body: 'Questa settimana c’è un’offerta per te. Scoprila e prenota in un tocco.', url: '/offerte' },
  { title: 'Posti liberi oggi', body: 'Ci sono ancora orari liberi oggi pomeriggio. Prenota ora.', url: '/prenota' },
];

const fmt = (iso: string) => new Date(iso).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' });

export function AdminPushBroadcast({ devices, users, history: initialHistory }: { devices: number; users: number; history: BroadcastLog[] }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('/prenota');
  const [history, setHistory] = useState(initialHistory);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function send() {
    setError(null);
    if (!window.confirm(`Inviare la notifica a ${users} ${users === 1 ? 'cliente' : 'clienti'} (${devices} dispositivi)?`)) return;
    start(async () => {
      const { sendBroadcastAction } = await import('@/lib/actions/push-admin');
      const res = await sendBroadcastAction({ title, body, url });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      toast.success(`Notifica inviata a ${res.users} ${res.users === 1 ? 'cliente' : 'clienti'}`);
      setHistory([{ at: new Date().toISOString(), title, body, url, sent: res.sent, users: res.users }, ...history]);
      setTitle('');
      setBody('');
    });
  }

  return (
    <section className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/10 bg-[#0e0e0e] p-4">
          <p className="text-xs text-white/55">Clienti con notifiche attive</p>
          <p className="mt-1 text-2xl font-bold text-white">{users}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#0e0e0e] p-4">
          <p className="text-xs text-white/55">Dispositivi</p>
          <p className="mt-1 text-2xl font-bold text-white">{devices}</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3 rounded-xl border border-white/10 bg-[#0e0e0e] p-5">
          <p className="text-sm font-semibold text-white">Nuova notifica</p>
          <div className="flex flex-wrap gap-2">
            {IDEAS.map((i) => (
              <button
                key={i.title}
                type="button"
                onClick={() => {
                  setTitle(i.title);
                  setBody(i.body);
                  setUrl(i.url);
                }}
                className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/75 hover:border-gold/60"
              >
                {i.title}
              </button>
            ))}
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-white/70">Titolo ({title.length}/60)</span>
            <input value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} className="input-dark" placeholder="Es. Posti liberi oggi" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-white/70">Testo ({body.length}/160)</span>
            <textarea value={body} maxLength={160} rows={3} onChange={(e) => setBody(e.target.value)} className="input-dark" placeholder="Breve e chiaro: cosa succede e cosa fare." />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-white/70">Toccando la notifica si apre</span>
            <select value={url} onChange={(e) => setUrl(e.target.value)} className="input-dark">
              {LINKS.map((l) => (
                <option key={l.url} value={l.url}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
          {error && <p className="text-sm text-red-300" role="alert">{error}</p>}
          <button
            type="button"
            onClick={send}
            disabled={pending || !title.trim() || !body.trim() || users === 0}
            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-gold px-5 text-sm font-semibold text-black disabled:opacity-50"
          >
            {pending ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <Send size={15} aria-hidden />} Invia a tutti
          </button>
          {users === 0 && <p className="text-xs text-white/55">Nessun cliente ha ancora attivato le notifiche. Si attivano dall’app, in Dashboard o Profilo.</p>}
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold text-white/60">Anteprima sul telefono</p>
          <div className="rounded-2xl border border-white/10 bg-[#1a1a1a] p-3 shadow-lg">
            <div className="flex gap-3">
              <Image src="/pwa/icon-192.png" alt="" width={38} height={38} className="h-[38px] w-[38px] rounded-lg" />
              <div className="min-w-0">
                <p className="flex justify-between gap-2 text-[11px] text-white/50">
                  <span>Garofalo</span>
                  <span>ora</span>
                </p>
                <p className="truncate text-sm font-semibold text-white">{title || 'Titolo della notifica'}</p>
                <p className="line-clamp-3 text-xs text-white/75">{body || 'Il testo comparirà qui.'}</p>
              </div>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-white/50">Consiglio: non più di una o due notifiche a settimana, altrimenti i clienti le disattivano.</p>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-white">Inviate</p>
        {history.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/15 p-5 text-center text-sm text-white/50">Nessuna notifica inviata finora.</p>
        ) : (
          <ul className="space-y-2">
            {history.map((h) => (
              <li key={h.at} className="rounded-xl border border-white/10 bg-[#0e0e0e] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-white">{h.title}</p>
                  <span className="text-xs text-white/50">
                    {fmt(h.at)} · {h.users} clienti · apre {h.url}
                  </span>
                </div>
                <p className="mt-1 text-sm text-white/70">{h.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
