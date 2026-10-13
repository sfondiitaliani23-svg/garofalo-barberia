'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Briefcase, Check, MailCheck, MessageSquareHeart, Printer, QrCode, Star, Trash2, BellRing } from 'lucide-react';
import { toast } from 'sonner';
import type { InboxItem } from '@/lib/actions/site-inbox';
import type { ShopQr } from '@/lib/data/qr';
import type { ComebackStats } from '@/lib/utils/comeback';
import type { BroadcastLog } from '@/lib/utils/push';
import { AdminPushBroadcast } from '@/components/admin/AdminPushBroadcast';

type Tab = 'feedback' | 'candidatura' | 'qr' | 'torna' | 'notifiche';

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' });

export function AdminInbox({ items: initial, qrs, scans, comeback, push }: { items: InboxItem[]; qrs: ShopQr[]; scans: Record<string, number>; comeback: ComebackStats; push: { devices: number; users: number; history: BroadcastLog[] } }) {
  const [items, setItems] = useState(initial);
  const [tab, setTab] = useState<Tab>('feedback');
  // Apertura diretta di una scheda dal link (es. ?tab=notifiche dalla barra laterale)
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tab') as Tab | null;
    if (t && ['feedback', 'candidatura', 'qr', 'torna', 'notifiche'].includes(t)) setTab(t);
  }, []);
  const [, start] = useTransition();

  const feedback = items.filter((i) => i.kind === 'feedback');
  const apps = items.filter((i) => i.kind === 'candidatura');
  const unread = (list: InboxItem[]) => list.filter((i) => !i.read).length;
  const avg = useMemo(() => {
    const r = feedback.map((f) => Number(f.data.rating)).filter((n) => n > 0);
    return r.length ? (r.reduce((a, b) => a + b, 0) / r.length).toFixed(1).replace('.', ',') : '–';
  }, [feedback]);

  function markRead(id: string) {
    setItems((list) => list.map((i) => (i.id === id ? { ...i, read: true } : i)));
    start(async () => {
      const { markInboxReadAction } = await import('@/lib/actions/site-inbox');
      await markInboxReadAction(id);
    });
  }
  function remove(id: string) {
    if (!window.confirm('Eliminare definitivamente questo messaggio?')) return;
    setItems((list) => list.filter((i) => i.id !== id));
    start(async () => {
      const { deleteInboxItemAction } = await import('@/lib/actions/site-inbox');
      const res = await deleteInboxItemAction(id);
      if (!res.ok) toast.error('Eliminazione non riuscita');
    });
  }

  const tabs: { id: Tab; label: string; icon: typeof Star; badge?: number }[] = [
    { id: 'feedback', label: 'Feedback anonimi', icon: MessageSquareHeart, badge: unread(feedback) },
    { id: 'candidatura', label: 'Candidature', icon: Briefcase, badge: unread(apps) },
    { id: 'qr', label: 'QR del salone', icon: QrCode },
    { id: 'torna', label: 'È ora di tornare', icon: MailCheck },
    { id: 'notifiche', label: 'Notifiche ai clienti', icon: BellRing },
  ];

  return (
    <div className="space-y-6">
      <header className="print:hidden">
        <h1 className="font-display text-3xl uppercase text-white">Messaggi e QR</h1>
        <p className="mt-1 text-sm text-white/50">Feedback anonimi, candidature, QR da stampare e promemoria “è ora di tornare”.</p>
      </header>

      <div className="flex flex-wrap gap-2 print:hidden" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition ${
              tab === t.id ? 'border-gold bg-gold text-black' : 'border-white/15 text-white/75 hover:border-gold/60'
            }`}
          >
            <t.icon size={15} aria-hidden /> {t.label}
            {!!t.badge && <span className={`rounded-full px-1.5 text-[11px] ${tab === t.id ? 'bg-black/20' : 'bg-gold text-black'}`}>{t.badge}</span>}
          </button>
        ))}
      </div>

      {tab === 'feedback' && (
        <section className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="Feedback ricevuti" value={String(feedback.length)} />
            <Stat label="Voto medio" value={avg} />
            <Stat label="Da leggere" value={String(unread(feedback))} />
          </div>
          {feedback.length === 0 ? (
            <Empty text="Nessun feedback ancora. Stampa il QR “Specchio” dalla scheda QR del salone." />
          ) : (
            feedback.map((f) => (
              <Card key={f.id} item={f} onRead={markRead} onDelete={remove}>
                <div className="flex items-center gap-1 text-gold-light" aria-label={`${f.data.rating} su 5`}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} size={15} fill={n <= Number(f.data.rating) ? 'currentColor' : 'none'} aria-hidden />
                  ))}
                  {f.data.visit && <span className="ml-2 text-xs text-white/50">{String(f.data.visit)}</span>}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-white/80">{f.data.message ? String(f.data.message) : <em className="text-white/40">Nessun commento</em>}</p>
              </Card>
            ))
          )}
        </section>
      )}

      {tab === 'candidatura' && (
        <section className="space-y-3">
          {apps.length === 0 ? (
            <Empty text="Nessuna candidatura. La pagina pubblica è /lavora-con-noi." />
          ) : (
            apps.map((a) => (
              <Card key={a.id} item={a} onRead={markRead} onDelete={remove}>
                <p className="font-semibold text-white">{String(a.data.name)}</p>
                <p className="text-xs text-white/55">
                  {String(a.data.role)} · {String(a.data.experience)}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  <a href={`tel:${String(a.data.phone)}`} className="text-gold-light underline">{String(a.data.phone)}</a>
                  {a.data.email && <a href={`mailto:${String(a.data.email)}`} className="text-gold-light underline">{String(a.data.email)}</a>}
                  {a.data.link && (
                    <a
                      href={String(a.data.link).startsWith('@') ? `https://instagram.com/${String(a.data.link).slice(1)}` : String(a.data.link)}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="text-gold-light underline"
                    >
                      {String(a.data.link)}
                    </a>
                  )}
                </div>
                {a.data.message && <p className="mt-2 whitespace-pre-wrap text-sm text-white/75">{String(a.data.message)}</p>}
                <p className="mt-2 text-[11px] text-white/35">Consenso privacy dato. Elimina la candidatura a fine selezione.</p>
              </Card>
            ))
          )}
        </section>
      )}

      {tab === 'notifiche' && <AdminPushBroadcast devices={push.devices} users={push.users} history={push.history} />}

      {tab === 'torna' && (
        <section className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Email inviate (30 giorni)" value={String(comeback.sent30)} />
            <Stat label="Clienti tornati (90 giorni)" value={`${comeback.booked90} su ${comeback.sent90}`} />
            <Stat label="Tasso di ritorno" value={comeback.sent90 ? `${comeback.rate90}%` : '–'} />
            <Stat label="Pronte per il prossimo invio" value={String(comeback.nextRun)} />
          </div>
          <p className="text-sm text-white/55">
            Ogni giorno tra le 10:30 e le 11:00 parte un’email a chi ha fatto l’ultimo taglio circa 5 settimane fa (6 per i bimbi, 3 per la sola barba) e non ha già un appuntamento.
            Un cliente conta come “tornato” se prenota entro 30 giorni dall’email. Si sono cancellati: <strong className="text-white">{comeback.optouts}</strong>.
          </p>
          {comeback.recent.length === 0 ? (
            <Empty text="Nessuna email ancora inviata. Il primo invio parte domani mattina." />
          ) : (
            <div className="overflow-hidden rounded-xl border border-white/10">
              <table className="w-full text-sm">
                <thead className="bg-white/[0.03] text-left text-xs uppercase tracking-wider text-white/45">
                  <tr><th className="px-4 py-2.5">Giorno</th><th className="px-4 py-2.5">Inviate</th><th className="px-4 py-2.5">Tornati</th></tr>
                </thead>
                <tbody>
                  {comeback.recent.map((r) => (
                    <tr key={r.day} className="border-t border-white/5">
                      <td className="px-4 py-2.5 text-white/80">{r.day}</td>
                      <td className="px-4 py-2.5 text-white">{r.sent}</td>
                      <td className="px-4 py-2.5 text-gold-light">{r.booked}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === 'qr' && (
        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
            <p className="max-w-xl text-sm text-white/55">
              Ogni QR ha un indirizzo fisso. Le scansioni (ultimi 90 giorni) contano solo chi accetta le statistiche nel banner cookie.
            </p>
            <button onClick={() => window.print()} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-gold px-4 text-sm font-semibold text-black">
              <Printer size={15} aria-hidden /> Stampa i QR
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-2">
            {qrs.map((q) => {
              const url = `https://barberiagarofalo.it/qr/${q.id}`;
              return (
                <div key={q.id} className="break-inside-avoid rounded-xl border border-white/10 bg-[#0e0e0e] p-4 text-center print:border-black print:bg-white print:text-black">
                  <p className="text-xs font-bold uppercase tracking-widest text-gold print:text-black">{q.label}</p>
                  <div className="mx-auto mt-3 w-fit rounded-lg bg-white p-3">
                    <QRCodeSVG value={url} size={150} level="M" />
                  </div>
                  <p className="mt-3 font-semibold text-white print:text-black">{q.invite}</p>
                  <p className="mt-1 text-xs text-white/45 print:text-black">barberiagarofalo.it/qr/{q.id}</p>
                  <div className="mt-3 border-t border-white/10 pt-2 text-xs text-white/55 print:hidden">
                    <p>{q.place}</p>
                    <p>
                      Porta a <code className="text-white/80">{q.to}</code> · <strong className="text-white">{scans[q.id] ?? 0}</strong> scansioni
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0e0e0e] p-4">
      <p className="text-xs text-white/50">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-white/50">{text}</p>;
}

function Card({ item, onRead, onDelete, children }: { item: InboxItem; onRead: (id: string) => void; onDelete: (id: string) => void; children: React.ReactNode }) {
  return (
    <article className={`rounded-xl border p-4 ${item.read ? 'border-white/10 bg-[#0e0e0e]' : 'border-gold/40 bg-gold/[0.05]'}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs text-white/45">
          {fmt(item.createdAt)}
          {!item.read && <span className="ml-2 rounded-full bg-gold px-1.5 text-[10px] font-bold text-black">NUOVO</span>}
        </span>
        <div className="flex gap-1">
          {!item.read && (
            <button onClick={() => onRead(item.id)} className="rounded-md p-1.5 text-white/60 hover:bg-white/10 hover:text-white" aria-label="Segna come letto">
              <Check size={15} />
            </button>
          )}
          <button onClick={() => onDelete(item.id)} className="rounded-md p-1.5 text-red-400/80 hover:bg-red-500/10 hover:text-red-400" aria-label="Elimina">
            <Trash2 size={15} />
          </button>
        </div>
      </div>
      {children}
    </article>
  );
}
