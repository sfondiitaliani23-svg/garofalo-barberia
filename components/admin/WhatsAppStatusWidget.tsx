'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import {
  AlertTriangle,
  QrCode,
  RefreshCw,
  Send,
  X,
  MessageCircle,
  Loader2,
  ChevronRight,
  BellRing,
  BarChart3,
  CalendarCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { buildWhatsAppReminderMessage } from '@/lib/utils/whatsapp-reminders';
import {
  getWhatsAppStatusAction,
  getWhatsAppQrAction,
  sendWhatsAppTestMessageAction,
  rebootWhatsAppInstanceAction,
  getWhatsAppNumberAction,
  getWhatsAppReminderStatsAction,
  getTomorrowWhatsAppQueueAction,
  markReminderGroupSentAction,
  type TomorrowReminderItem,
  type WhatsAppState,
} from '@/lib/actions/whatsapp-admin';

const WA_TABS = [
  { id: 'tomorrow' as const, label: 'Promemoria di domani', icon: CalendarCheck },
  { id: 'messages' as const, label: 'Messaggi automatici', icon: BellRing },
  { id: 'test' as const, label: 'Invia test', icon: Send },
  { id: 'stats' as const, label: 'Statistiche', icon: BarChart3 },
];

/** Testi reali inviati dal sito (lib/utils/whatsapp-reminders.ts e lib/actions/*). */
const SAMPLE_REMINDER = buildWhatsAppReminderMessage({
  customerName: 'Mario',
  customerPhone: '',
  serviceName: 'Taglio e shampoo',
  barberName: 'Luigi Garofalo',
  startsAt: new Date('2026-10-14T08:30:00Z'),
});
const WA_MESSAGES = {
  reminder: { title: 'Promemoria la sera prima', trigger: 'Ogni sera alle 22:30, per gli appuntamenti del giorno dopo', when: '22:30', text: SAMPLE_REMINDER },
  immediate: { title: 'Promemoria immediato', trigger: 'Subito, se si prenota dopo le 22:30 per il giorno dopo', when: 'subito', text: SAMPLE_REMINDER },
  otp: {
    title: 'Codice di accesso',
    trigger: 'Quando un cliente accede con "WhatsApp (OTP)"',
    when: 'subito',
    text: 'Barberia Garofalo: il tuo codice di accesso è 048213. Scade tra 5 minuti. Non condividerlo con nessuno.',
  },
  test: {
    title: 'Messaggio di prova',
    trigger: 'Quando premi "Invia test"',
    when: 'subito',
    text: '💈 *Garofalo Barberia — Test Notifiche WhatsApp*\n\n✅ Connessione stabilita con successo!\nIl sistema di promemoria automatici per gli appuntamenti alle 22:30 è ora perfettamente operativo.',
  },
};
type WaMessageId = keyof typeof WA_MESSAGES;

/** Formattazione WhatsApp: *grassetto*, a capo. */
function renderWa(text: string) {
  return text.split('\n').map((line, i) => (
    <span key={i} className="block min-h-[0.6em] break-words">
      {line.split(/(\*[^*]+\*)/g).map((part, j) => (part.startsWith('*') && part.endsWith('*') && part.length > 2 ? <strong key={j}>{part.slice(1, -1)}</strong> : part))}
    </span>
  ));
}

function formatWaNumber(raw: string) {
  const d = raw.replace(/\D/g, '');
  if (d.startsWith('39') && d.length >= 11) return `+39 ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8)}`;
  return `+${d}`;
}

export function WhatsAppStatusWidget() {
  const [status, setStatus] = useState<WhatsAppState>('starting');
  const [instanceId, setInstanceId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [rebooting, setRebooting] = useState(false);
  const [tab, setTab] = useState<'tomorrow' | 'messages' | 'test' | 'stats'>('tomorrow');
  const [queue, setQueue] = useState<TomorrowReminderItem[] | null>(null);
  const [quotaMsg, setQuotaMsg] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<WaMessageId>('reminder');
  const [waNumber, setWaNumber] = useState<string | null>(null);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getWhatsAppReminderStatsAction>> | null>(null);

  useEffect(() => {
    if (!modalOpen) return;
    getWhatsAppNumberAction().then((r) => setWaNumber(r.phone ?? null)).catch(() => {});
    getWhatsAppReminderStatsAction().then(setStats).catch(() => {});
    getTomorrowWhatsAppQueueAction().then(setQueue).catch(() => setQueue([]));
  }, [modalOpen]);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Recupera lo stato attuale di connessione
  const fetchStatus = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res = await getWhatsAppStatusAction();
      if (res.ok) {
        setStatus(res.state);
        if (res.instanceId) setInstanceId(res.instanceId);
      } else {
        setStatus(res.state || 'error');
      }
    } catch {
      setStatus('error');
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  // Recupera il QR code live
  const fetchQr = useCallback(async () => {
    setQrLoading(true);
    try {
      const res = await getWhatsAppQrAction();
      if (res.ok) {
        if (res.type === 'alreadyAuthorized') {
          setStatus('authorized');
          setQrBase64(null);
          toast.success('WhatsApp è già collegato ed autorizzato!');
        } else if (res.qrBase64) {
          setQrBase64(res.qrBase64);
        }
      } else {
        toast.error(res.error || 'Impossibile generare il QR code');
      }
    } catch {
      toast.error('Errore durante il recupero del QR code');
    } finally {
      setQrLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Polling automatico mentre il modale è aperto per verificare quando l'utente inquadra il QR
  useEffect(() => {
    if (!modalOpen) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      return;
    }

    fetchQr();

    pollingRef.current = setInterval(async () => {
      const res = await getWhatsAppStatusAction();
      if (res.ok && res.state === 'authorized') {
        setStatus('authorized');
        setQrBase64(null);
        toast.success('🎉 WhatsApp Salone collegato con successo! Invio automatico attivo.');
        if (pollingRef.current) clearInterval(pollingRef.current);
      }
    }, 4000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [modalOpen, fetchQr]);

  const handleSendTest = async () => {
    if (!testPhone.trim()) {
      toast.error('Inserisci un numero di telefono per il test');
      return;
    }
    setTestSending(true);
    try {
      const res = await sendWhatsAppTestMessageAction(testPhone.trim());
      if (res.ok) {
        toast.success('✅ Messaggio WhatsApp di prova inviato con successo!');
      } else {
        if (res.quota) setQuotaMsg(res.error ?? null);
        toast.error(res.error || 'Errore durante l\'invio di prova', { duration: 10000 });
      }
    } catch (e: any) {
      toast.error(e?.message || 'Errore durante l\'invio');
    } finally {
      setTestSending(false);
    }
  };

  const handleReboot = async () => {
    setRebooting(true);
    try {
      const res = await rebootWhatsAppInstanceAction();
      if (res.ok) {
        toast.success('Istanza riavviata. Aggiornamento in corso...');
        setTimeout(() => {
          fetchStatus();
          if (modalOpen) fetchQr();
        }, 3000);
      } else {
        toast.error(res.error || 'Errore riavvio istanza');
      }
    } finally {
      setRebooting(false);
    }
  };

  const isConnected = status === 'authorized';

  return (
    <>
      <div className="rounded-xl border border-gold/40 bg-black/30 p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
                isConnected
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400 shadow-emerald-950/40'
                  : 'border-amber-500/40 bg-amber-500/10 text-amber-400'
              }`}
            >
              <MessageCircle size={22} className={isConnected ? 'text-emerald-400' : 'text-amber-400 animate-pulse'} />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white text-sm">Promemoria WhatsApp Automatici</h3>
                {loading ? (
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/50 animate-pulse">
                    Verifica in corso...
                  </span>
                ) : isConnected ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Collegato (22:30 Attivo)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    <AlertTriangle size={11} />
                    Da Collegare
                  </span>
                )}
              </div>

              <p className="mt-0.5 text-xs text-white/60">
                {isConnected
                  ? 'Il telefono del salone è connesso. I clienti riceveranno i promemoria la sera prima alle 22:30.'
                  : 'Inquadra il QR code con il WhatsApp del salone per attivare l\'invio automatico alle 22:30.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 [&_*]:rounded-none">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalOpen(true)}
              className={`gap-1.5 text-xs font-semibold ${
                isConnected
                  ? 'border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10'
                  : 'border-gold bg-gold/10 text-gold hover:bg-gold hover:text-black'
              }`}
            >
              <QrCode size={14} />
              {isConnected ? 'Gestione / Test WhatsApp' : 'Collega WhatsApp Salone (QR)'}
            </Button>
          </div>
        </div>
      </div>

      {/* ── MODALE COLLEGAMENTO WHATSAPP (concept 03) ──────────────── */}
      {modalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="wa-title">
            <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0d] text-white shadow-2xl">
              <div className="flex shrink-0 items-start justify-between border-b border-white/10 px-6 py-4">
                <div>
                  <h3 id="wa-title" className="text-2xl text-white" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                    Collegamento WhatsApp Salone
                  </h3>
                  <p className="text-xs text-white/50">Promemoria automatici e codici di accesso inviati dal numero del salone.</p>
                </div>
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg p-1.5 text-white/50 transition hover:bg-white/10 hover:text-white" aria-label="Chiudi">
                  <X size={18} />
                </button>
              </div>

              {quotaMsg && (
                <div className="mx-5 mt-4 flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm" role="alert">
                  <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-300" aria-hidden />
                  <div>
                    <p className="font-semibold text-amber-200">Promemoria e codici WhatsApp bloccati per i clienti</p>
                    <p className="mt-1 text-xs text-amber-100/80">{quotaMsg}</p>
                    <a
                      href="https://console.green-api.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-xs font-semibold text-gold underline-offset-2 hover:underline"
                    >
                      Apri la console Green API →
                    </a>
                  </div>
                </div>
              )}
              <div className="admin-modal-scroll grid min-h-0 flex-1 gap-4 overflow-y-auto p-5 lg:grid-cols-[260px_minmax(0,1fr)_minmax(0,1fr)]">
                {/* Colonna sinistra: numero e menu */}
                <div className="space-y-4">
                  <div className={`rounded-xl border p-4 ${isConnected ? 'border-emerald-500/30 bg-emerald-500/[0.06]' : 'border-amber-500/30 bg-amber-500/[0.06]'}`}>
                    <div className="flex items-start gap-3">
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${isConnected ? 'bg-emerald-500 text-black' : 'bg-amber-500/20 text-amber-300'}`}>
                        <MessageCircle size={20} aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <p className={`text-xs font-semibold ${isConnected ? 'text-emerald-300' : 'text-amber-300'}`}>
                          {isConnected ? 'Numero collegato' : 'Non collegato'}
                        </p>
                        <p className="truncate text-base font-semibold text-white">{waNumber ? formatWaNumber(waNumber) : isConnected ? 'Numero del salone' : '—'}</p>
                      </div>
                      {isConnected && (
                        <span className="ml-auto rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">Attivo</span>
                      )}
                    </div>
                    <p className="mt-3 text-[11px] text-white/50">
                      {stats?.lastSentAt
                        ? `Ultimo promemoria: ${new Date(stats.lastSentAt).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' })}`
                        : 'Nessun promemoria registrato'}
                    </p>
                    <button
                      type="button"
                      onClick={handleReboot}
                      disabled={rebooting}
                      className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-gold/60 px-3 py-1.5 text-xs font-semibold text-gold transition hover:bg-gold hover:text-black disabled:opacity-50"
                    >
                      <RefreshCw size={12} className={rebooting ? 'animate-spin' : ''} />
                      Ricollega o cambia numero
                    </button>
                  </div>

                  <nav className="space-y-1.5" aria-label="Sezioni">
                    {WA_TABS.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTab(t.id)}
                        aria-current={tab === t.id}
                        className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                          tab === t.id ? 'border-gold/50 bg-gold/10 text-gold' : 'border-white/10 text-white/75 hover:border-white/25'
                        }`}
                      >
                        <t.icon size={15} aria-hidden />
                        {t.label}
                        <ChevronRight size={14} className="ml-auto opacity-50" aria-hidden />
                      </button>
                    ))}
                  </nav>
                </div>

                {/* Colonna centrale: anteprima telefono o QR */}
                <div className="flex justify-center">
                  {isConnected ? (
                    <div className="flex w-full max-w-[320px] flex-col overflow-hidden rounded-[28px] border-4 border-[#1f1f1f] bg-[#0b141a] shadow-xl">
                      <div className="flex items-center gap-2.5 bg-[#1f2c34] px-4 py-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold text-[11px] font-bold text-black">GB</span>
                        <div>
                          <p className="text-sm font-semibold text-white">Barberia Garofalo</p>
                          <p className="text-[10px] text-white/50">anteprima</p>
                        </div>
                      </div>
                      <div className="flex min-h-[340px] flex-1 flex-col justify-end gap-2 p-3" style={{ background: '#0b141a' }}>
                        <div className="max-w-[92%] self-start rounded-lg rounded-tl-none bg-[#202c33] px-3 py-2 text-[12.5px] leading-snug text-white/90">
                          {renderWa(WA_MESSAGES[previewId].text)}
                          <p className="mt-1 text-right text-[10px] text-white/40">{WA_MESSAGES[previewId].when}</p>
                        </div>
                      </div>
                      <p className="bg-[#1f2c34] px-4 py-2 text-center text-[10px] text-white/45">Testo reale inviato dal sito · dati di esempio</p>
                    </div>
                  ) : (
                    <div className="w-full max-w-[320px] rounded-xl border border-white/10 bg-black/60 p-4 text-center">
                      <p className="mb-3 text-xs font-semibold text-white/80">Inquadra con il telefono del salone</p>
                      <div className="relative mx-auto flex h-60 w-60 items-center justify-center rounded-xl bg-white p-3">
                        {qrLoading ? (
                          <Loader2 className="animate-spin text-gold" size={32} />
                        ) : qrBase64 ? (
                          <img src={`data:image/png;base64,${qrBase64}`} alt="Codice QR per collegare WhatsApp" className="h-full w-full object-contain" />
                        ) : (
                          <Button type="button" size="sm" variant="outline" onClick={fetchQr} className="border-black/20 text-xs text-black">
                            Genera QR
                          </Button>
                        )}
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={fetchQr} disabled={qrLoading} className="mt-3 gap-1 text-xs text-white/60 hover:text-white">
                        <RefreshCw size={12} className={qrLoading ? 'animate-spin' : ''} />
                        Aggiorna QR
                      </Button>
                      <ol className="mt-3 list-inside list-decimal space-y-1 text-left text-xs text-white/65">
                        <li>Apri <strong>WhatsApp</strong> sul telefono del salone</li>
                        <li>Vai in <strong>Impostazioni → Dispositivi collegati</strong></li>
                        <li>Tocca <strong>Collega un dispositivo</strong> e inquadra il QR</li>
                      </ol>
                    </div>
                  )}
                </div>

                {/* Colonna destra: contenuto della sezione */}
                <div className="rounded-xl border border-white/10 bg-[#111] p-4">
                  {tab === 'tomorrow' && (
                    <>
                      <p className="text-sm font-semibold text-white">Promemoria di domani</p>
                      <p className="text-xs text-white/50">
                        Gratis e senza limiti: tocca &quot;Apri WhatsApp&quot;, premi invia dal telefono del salone. Il cliente risulta avvisato.
                      </p>
                      <ul className="mt-3 max-h-[360px] space-y-2 overflow-y-auto pr-1">
                        {queue === null ? (
                          <li className="text-xs text-white/40">Caricamento...</li>
                        ) : queue.length === 0 ? (
                          <li className="text-xs text-white/40">Nessun appuntamento con telefono per domani.</li>
                        ) : (
                          queue.map((q) => (
                            <li key={q.ids[0]} className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${q.sent ? 'border-emerald-500/25 opacity-70' : 'border-white/10'}`}>
                              <span className="w-11 shrink-0 text-sm font-semibold tabular-nums text-gold">{q.time}</span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm text-white">{q.name}</span>
                                <span className="block truncate text-[11px] text-white/45">{q.service}</span>
                              </span>
                              {q.sent ? (
                                <span className="text-[11px] font-semibold text-emerald-300">Avvisato</span>
                              ) : (
                                <a
                                  href={q.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={() => {
                                    setQueue((list) => list?.map((x) => (x.ids[0] === q.ids[0] ? { ...x, sent: true } : x)) ?? null);
                                    void markReminderGroupSentAction(q.ids);
                                  }}
                                  className="shrink-0 rounded-full bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-500"
                                >
                                  Apri WhatsApp
                                </a>
                              )}
                            </li>
                          ))
                        )}
                      </ul>
                      {queue && queue.length > 0 && (
                        <p className="mt-2 text-[11px] text-white/45">
                          {queue.filter((q) => q.sent).length} di {queue.length} avvisati. L&apos;email di promemoria parte comunque in automatico alle 22:30.
                        </p>
                      )}
                    </>
                  )}

                  {tab === 'messages' && (
                    <>
                      <p className="text-sm font-semibold text-white">Messaggi automatici</p>
                      <p className="text-xs text-white/50">Cosa invia il sito, e quando. Tocca per l&apos;anteprima.</p>
                      <ul className="mt-3 space-y-2">
                        {(Object.keys(WA_MESSAGES) as WaMessageId[]).map((id) => (
                          <li key={id}>
                            <button
                              type="button"
                              onClick={() => setPreviewId(id)}
                              aria-pressed={previewId === id}
                              className={`w-full rounded-lg border px-3 py-2.5 text-left transition ${previewId === id ? 'border-gold/50 bg-gold/10' : 'border-white/10 hover:border-white/25'}`}
                            >
                              <span className="block text-sm font-semibold text-white">{WA_MESSAGES[id].title}</span>
                              <span className="block text-[11px] text-white/50">{WA_MESSAGES[id].trigger}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  {tab === 'test' && (
                    <>
                      <p className="text-sm font-semibold text-white">Invia messaggio di prova</p>
                      <p className="text-xs text-white/50">Ricevi il messaggio di prova su un numero a tua scelta, per controllare la consegna.</p>
                      <div className="mt-4 flex gap-2">
                        <Input
                          type="tel"
                          value={testPhone}
                          onChange={(e) => setTestPhone(e.target.value)}
                          placeholder="Es. 3201886277"
                          className="h-10 border-white/15 bg-black/60 text-sm"
                          aria-label="Numero per il test"
                        />
                        <Button type="button" onClick={handleSendTest} disabled={testSending || !isConnected} className="h-10 shrink-0 gap-1.5 bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-500">
                          {testSending ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
                          Invia test
                        </Button>
                      </div>
                      {!isConnected && <p className="mt-2 text-xs text-amber-300">Collega prima WhatsApp con il QR.</p>}
                      <button type="button" onClick={() => setPreviewId('test')} className="mt-3 text-xs text-gold hover:underline">
                        Vedi il testo del messaggio di prova
                      </button>
                    </>
                  )}

                  {tab === 'stats' && (
                    <>
                      <p className="text-sm font-semibold text-white">Statistiche promemoria</p>
                      <p className="text-xs text-white/50">Dalle prenotazioni: quando un promemoria parte, viene registrato.</p>
                      <dl className="mt-4 grid grid-cols-2 gap-2">
                        {[
                          ['Inviati oggi', stats?.today],
                          ['Ultimi 7 giorni', stats?.week],
                          ['Da inviare stasera', stats?.pendingTonight],
                        ].map(([label, value]) => (
                          <div key={label as string} className="rounded-lg border border-white/10 p-3">
                            <dt className="text-[11px] text-white/50">{label}</dt>
                            <dd className="mt-1 text-xl font-semibold tabular-nums text-white">{value ?? '…'}</dd>
                          </div>
                        ))}
                      </dl>
                      <p className="mt-3 text-[11px] text-white/45">&quot;Da inviare stasera&quot;: appuntamenti di domani con telefono e senza promemoria.</p>
                    </>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center justify-between border-t border-white/10 px-6 py-3">
                <span className="text-[11px] text-white/40">{instanceId ? `Istanza #${instanceId}` : 'Green API'}</span>
                <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)} className="border-white/20 text-xs text-white">
                  Chiudi
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
