'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import {
  CheckCircle2,
  AlertTriangle,
  QrCode,
  RefreshCw,
  Send,
  X,
  MessageCircle,
  Smartphone,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  getWhatsAppStatusAction,
  getWhatsAppQrAction,
  sendWhatsAppTestMessageAction,
  rebootWhatsAppInstanceAction,
  type WhatsAppState,
} from '@/lib/actions/whatsapp-admin';

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
        toast.error(res.error || 'Errore durante l\'invio di prova');
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
      <div className="rounded-xl border border-white/10 bg-gradient-to-r from-[#141414] via-[#1a1a1a] to-[#141414] p-4 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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

          <div className="flex flex-wrap items-center gap-2">
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

      {/* ── MODALE COLLEGAMENTO QR CODE & TEST ──────────────── */}
      {modalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden rounded-2xl border border-gold/30 bg-[#121212] text-white shadow-2xl">
              {/* Header Fisso */}
              <div className="shrink-0 flex items-center justify-between border-b border-white/10 px-6 py-4 bg-black/40">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                    <Smartphone size={18} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base text-white">Collegamento WhatsApp Salone</h3>
                    <p className="text-[11px] text-white/50">Promemoria Appuntamenti Automatici</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white transition"
                  aria-label="Chiudi"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Corpo Scrollabile con scrollbar stilizzata */}
              <div className="admin-modal-scroll flex-1 overflow-y-auto min-h-0 px-6 py-5 space-y-5">
                {/* Stato Attuale */}
                <div
                  className={`rounded-xl border p-4 ${
                    isConnected
                      ? 'border-emerald-500/40 bg-emerald-500/10'
                      : 'border-amber-500/40 bg-amber-500/10'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {isConnected ? (
                      <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle size={20} className="text-amber-400 shrink-0" />
                    )}
                    <div>
                      <h4 className="font-semibold text-sm text-white">
                        {isConnected ? 'WhatsApp Salone Collegato ✅' : 'WhatsApp Non Collegato'}
                      </h4>
                      <p className="text-xs text-white/70 mt-0.5">
                        {isConnected
                          ? 'I promemoria partiranno automaticamente ogni sera alle 22:30.'
                          : 'Segui le istruzioni qui sotto per inquadrare il codice QR.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Sezione QR Code (se non connesso) */}
                {!isConnected ? (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-white/10 bg-black/60 p-4 text-center">
                      <p className="text-xs font-semibold text-white/80 mb-3">
                        Inquadra con il telefono aziendale:
                      </p>

                      <div className="relative mx-auto flex h-60 w-60 items-center justify-center rounded-xl bg-white p-3 shadow-xl">
                        {qrLoading ? (
                          <div className="flex flex-col items-center gap-2 text-black">
                            <Loader2 className="animate-spin text-gold" size={32} />
                            <span className="text-xs font-medium text-black/70">Generazione QR Code...</span>
                          </div>
                        ) : qrBase64 ? (
                          <img
                            src={`data:image/png;base64,${qrBase64}`}
                            alt="WhatsApp QR Code"
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <div className="text-center text-black/60 p-2">
                            <p className="text-xs">QR non pronto</p>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={fetchQr}
                              className="mt-2 text-xs border-black/20 text-black"
                            >
                              Riprova
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 flex items-center justify-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={fetchQr}
                          disabled={qrLoading}
                          className="text-xs text-white/60 hover:text-white gap-1"
                        >
                          <RefreshCw size={12} className={qrLoading ? 'animate-spin' : ''} />
                          Aggiorna QR
                        </Button>
                      </div>
                    </div>

                    {/* Istruzioni Semplici per Luigi */}
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-xs text-white/75 space-y-2">
                      <p className="font-semibold text-white uppercase text-[11px] tracking-wider text-gold">
                        Istruzioni sul telefono del salone:
                      </p>
                      <ol className="list-decimal list-inside space-y-1 text-white/70">
                        <li>Apri <strong>WhatsApp</strong> sul telefono aziendale</li>
                        <li>Vai in <strong>Impostazioni</strong> (o i 3 puntini in alto a destra)</li>
                        <li>Tocca <strong>Dispositivi collegati</strong> → <strong>Collega un dispositivo</strong></li>
                        <li>Inquadra il codice QR qui sopra sullo schermo</li>
                      </ol>
                    </div>
                  </div>
                ) : (
                  /* Sezione Test Invio quando è già connesso */
                  <div className="space-y-4">
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
                      <h4 className="font-semibold text-sm text-emerald-400 flex items-center gap-2">
                        <Send size={15} />
                        Invia Messaggio di Prova
                      </h4>
                      <p className="text-xs text-white/60">
                        Inserisci un numero di cellulare per ricevere un messaggio WhatsApp di test e verificare la corretta consegna.
                      </p>

                      <div className="flex gap-2">
                        <Input
                          type="tel"
                          value={testPhone}
                          onChange={(e) => setTestPhone(e.target.value)}
                          placeholder="Es. 3201886277"
                          className="bg-black/60 border-white/15 text-sm h-10"
                        />
                        <Button
                          type="button"
                          onClick={handleSendTest}
                          disabled={testSending}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 shrink-0 h-10 gap-1.5"
                        >
                          {testSending ? (
                            <Loader2 className="animate-spin" size={14} />
                          ) : (
                            <Send size={14} />
                          )}
                          Invia Test
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-center">
                      <p className="text-xs text-white/50 mb-2">
                        Hai bisogno di ricollegare o cambiare numero?
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleReboot}
                        disabled={rebooting}
                        className="text-xs border-white/20 text-white/80 hover:text-white gap-1.5"
                      >
                        <RefreshCw size={13} className={rebooting ? 'animate-spin' : ''} />
                        Riavvia Sessione / Mostra QR
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Fisso */}
              <div className="shrink-0 border-t border-white/10 px-6 py-4 bg-black/40 flex justify-between items-center">
                <span className="text-[11px] text-white/40">
                  {instanceId ? `Istanza #${instanceId}` : 'Green API'}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalOpen(false)}
                  className="text-xs border-white/20 text-white"
                >
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
