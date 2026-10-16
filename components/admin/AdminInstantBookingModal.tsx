'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Mic, Square, X, Loader2, Wand2, Check, CircleDashed } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { createAdminAppointment } from '@/lib/actions/admin';
import { parseBookingSpeech, type VoiceBookingResult } from '@/lib/utils/voice-booking';

interface AdminInstantBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const field =
  'mt-1 block h-10 w-full border border-gold/30 bg-black/50 px-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-gold [color-scheme:dark]';
const label = 'block text-[11px] font-semibold uppercase tracking-[0.15em] text-white/55';

function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const MIC_ERRORS: Record<string, string> = {
  'not-allowed': 'Il microfono è bloccato. Clicca il lucchetto vicino all\'indirizzo e consenti il microfono.',
  'service-not-allowed': 'Il microfono è bloccato. Clicca il lucchetto vicino all\'indirizzo e consenti il microfono.',
  'no-speech': 'Non ho sentito niente. Riprova e parla vicino al microfono.',
  'audio-capture': 'Non trovo il microfono. Controlla che sia collegato.',
  network: 'Per il riconoscimento vocale serve internet.',
};

export function AdminInstantBookingModal({ isOpen, onClose }: AdminInstantBookingModalProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [barbers, setBarbers] = useState<{ id: string; name: string }[]>([]);
  const [services, setServices] = useState<{ id: string; name: string }[]>([]);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('10:00');
  const [barberId, setBarberId] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceWeeks, setRecurrenceWeeks] = useState(4);

  // Voce
  const [isListening, setIsListening] = useState(false);
  const [speechText, setSpeechText] = useState('');
  const [heard, setHeard] = useState<VoiceBookingResult | null>(null);
  const recognitionRef = useRef<any>(null);
  const finalTextRef = useRef('');
  const silenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listsRef = useRef({ barbers, services });
  listsRef.current = { barbers, services };

  useEffect(() => {
    if (!isOpen) {
      stopListening();
      return;
    }
    setDate(todayLocal());
    setSpeechText('');
    setHeard(null);
    setCustomerName('');
    setCustomerPhone('');
    setIsRecurring(false);

    const supabase = createClient();
    if (!supabase) return;
    (async () => {
      const { data: bData } = await supabase.from('barbers').select('id, name').eq('is_active', true);
      const { data: sData } = await supabase.from('services').select('id, name').eq('is_active', true);
      if (bData && bData.length > 0) {
        setBarbers(bData);
        setBarberId(bData[0].id);
      }
      if (sData && sData.length > 0) {
        setServices(sData);
        setSelectedServiceIds([sData[0].id]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  useEffect(() => () => stopListening(), []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  /** Applica sul modulo solo quello che è stato capito; il resto resta com'era. */
  function applyParsed(parsed: VoiceBookingResult) {
    if (parsed.customerName) setCustomerName(parsed.customerName);
    if (parsed.customerPhone) setCustomerPhone(parsed.customerPhone);
    if (parsed.dateStr) setDate(parsed.dateStr);
    if (parsed.timeStr) setTime(parsed.timeStr);
    if (parsed.barberId) setBarberId(parsed.barberId);
    if (parsed.serviceIds.length > 0) setSelectedServiceIds(parsed.serviceIds);
    setIsRecurring(parsed.isRecurring);
    if (parsed.isRecurring) setRecurrenceWeeks(parsed.recurrenceWeeks);
    setHeard(parsed);
  }

  function runParse(text: string) {
    const { barbers: b, services: sv } = listsRef.current;
    const parsed = parseBookingSpeech(text, b, sv);
    applyParsed(parsed);
    return parsed;
  }

  function stopListening() {
    if (silenceTimer.current) clearTimeout(silenceTimer.current);
    silenceTimer.current = null;
    try {
      recognitionRef.current?.stop();
    } catch {
      /* già fermo */
    }
  }

  function startVoiceInput() {
    if (isListening) {
      stopListening();
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast.error('Questo browser non ascolta la voce. Usa Google Chrome, oppure scrivi la frase qui sotto e premi "Compila".');
      return;
    }

    const recognition = new SR();
    recognition.lang = 'it-IT';
    recognition.continuous = true; // non si ferma alla prima pausa: puoi dire nome, numero e data con calma
    recognition.interimResults = true; // si vede il testo mentre parli
    recognition.maxAlternatives = 3; // tra più ascolti si sceglie quello che riempie più campi
    try {
      // Chrome recente: suggerisce al riconoscimento i nomi di barbieri e servizi
      const Phrase = (window as any).SpeechRecognitionPhrase;
      if (Phrase && 'phrases' in recognition) {
        const { barbers: b, services: sv } = listsRef.current;
        recognition.phrases = [...b.map((x) => x.name), ...b.map((x) => x.name.split(' ')[0]), ...sv.map((x) => x.name)].map(
          (x) => new Phrase(x, 5),
        );
      }
    } catch {
      /* non supportato: nessun problema */
    }

    finalTextRef.current = '';
    let errored = false;
    const armSilence = () => {
      if (silenceTimer.current) clearTimeout(silenceTimer.current);
      // 3 secondi di silenzio dopo che hai parlato: mi fermo da solo
      silenceTimer.current = setTimeout(() => stopListening(), 3000);
    };

    recognition.onstart = () => {
      setIsListening(true);
      setSpeechText('');
      setHeard(null);
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      let finals = '';
      for (let i = 0; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) {
          // tra le alternative scelgo quella da cui si capiscono più campi
          let best = res[0].transcript as string;
          let bestScore = -1;
          for (let a = 0; a < res.length; a++) {
            const sc = parseBookingSpeech(res[a].transcript, listsRef.current.barbers, listsRef.current.services).score;
            if (sc > bestScore) {
              bestScore = sc;
              best = res[a].transcript;
            }
          }
          finals += `${best} `;
        } else {
          interim += `${res[0].transcript} `;
        }
      }
      finalTextRef.current = finals.trim();
      const shown = `${finals}${interim}`.trim();
      setSpeechText(shown);
      if (shown) armSilence();
    };

    recognition.onerror = (e: any) => {
      errored = true;
      toast.error(MIC_ERRORS[e?.error] ?? 'Il riconoscimento vocale non ha funzionato. Riprova.');
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (silenceTimer.current) clearTimeout(silenceTimer.current);
      const text = finalTextRef.current;
      if (text) {
        const parsed = runParse(text);
        if (parsed.score === 0) toast.warning('Ho sentito la frase ma non ho capito i dati. Controlla il testo e premi "Compila".');
      } else if (!errored) {
        toast.warning('Non ho sentito niente. Riprova e parla vicino al microfono.');
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      toast.error('Il microfono è già in uso. Riprova tra un attimo.');
    }
  }

  const handleSave = () => {
    if (!customerName.trim()) return void toast.error('Inserisci il nome e cognome del cliente.');
    if (!date) return void toast.error('Inserisci la data.');
    if (!time) return void toast.error("Inserisci l'orario.");
    if (!barberId) return void toast.error('Seleziona un barbiere.');
    if (selectedServiceIds.length === 0) return void toast.error('Seleziona almeno un servizio.');

    startTransition(async () => {
      const result = await createAdminAppointment({
        serviceIds: selectedServiceIds,
        barberId,
        date,
        time,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        recurrenceWeeks: isRecurring ? recurrenceWeeks : 1,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      if (result.isRecurring) {
        const succ = result.successCount || 0;
        const fail = result.failedCount || 0;
        if (fail > 0) toast.warning(`Prenotate ${succ} settimane su ${succ + fail}. Alcune date erano già occupate.`);
        else toast.success(`Prenotate con successo tutte le ${succ} settimane!`);
      } else {
        toast.success('Prenotazione creata.');
      }
      router.refresh();
      onClose();
    });
  };

  const chips: { label: string; ok: boolean }[] = heard
    ? [
        { label: 'Nome', ok: !!heard.customerName },
        { label: 'Telefono', ok: !!heard.customerPhone },
        { label: 'Data', ok: !!heard.dateStr },
        { label: 'Ora', ok: !!heard.timeStr },
        { label: 'Barbiere', ok: !!heard.barberId },
        { label: 'Servizio', ok: heard.serviceIds.length > 0 },
      ]
    : [];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[250] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Prenotazione istantanea"
        className="flex max-h-[94vh] w-full max-w-lg cursor-default flex-col overflow-hidden border border-gold/50 bg-[#0c0a08] shadow-2xl sm:max-h-[90vh]"
      >
        {/* Testata */}
        <div className="flex items-start justify-between gap-4 border-b border-gold/25 px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-bold uppercase tracking-wide text-gold">Prenotazione istantanea</h2>
            <p className="mt-0.5 text-xs text-white/50">Parla, scrivi o compila a mano.</p>
          </div>
          <button onClick={onClose} aria-label="Chiudi" className="p-1 text-white/45 transition hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="admin-modal-scroll min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {/* Voce */}
          <section className="border border-gold/20 bg-gold/[0.04] p-4">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={startVoiceInput}
                aria-label={isListening ? 'Ferma la registrazione' : 'Parla per compilare'}
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full transition ${
                  isListening
                    ? 'animate-pulse bg-red-600 text-white shadow-lg shadow-red-600/30'
                    : 'border border-gold/40 bg-gold/15 text-gold hover:bg-gold/25'
                }`}
              >
                {isListening ? <Square size={20} /> : <Mic size={24} />}
              </button>
              <div className="min-w-0 text-left">
                <p className="text-sm font-semibold text-white/85">
                  {isListening ? 'Sto ascoltando… Premi per fermare' : 'Premi il microfono e parla'}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-white/50">
                  Dì nome, telefono, giorno, ora, barbiere e servizio. Esempio:{' '}
                  <span className="italic text-gold/80">&quot;Mario Rossi 320 123 4567 sabato alle dieci e mezza con Vittorio, taglio e shampoo&quot;</span>
                </p>
              </div>
            </div>

            <label htmlFor="inst-speech" className={`${label} mt-4`}>
              Frase (puoi correggerla)
            </label>
            <textarea
              id="inst-speech"
              rows={2}
              value={speechText}
              onChange={(e) => setSpeechText(e.target.value)}
              placeholder="La frase compare qui mentre parli. Puoi anche scriverla."
              className="mt-1 block w-full resize-none border border-gold/30 bg-black/50 px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-gold"
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5" aria-live="polite">
                {chips.map((c) => (
                  <span
                    key={c.label}
                    className={`inline-flex items-center gap-1 border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                      c.ok ? 'border-emerald-500/40 text-emerald-300' : 'border-white/15 text-white/40'
                    }`}
                  >
                    {c.ok ? <Check size={11} /> : <CircleDashed size={11} />}
                    {c.label}
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={() => speechText.trim() && runParse(speechText)}
                disabled={!speechText.trim() || isListening}
                className="inline-flex h-8 items-center gap-1.5 border border-gold/50 px-3 text-[11px] font-bold uppercase tracking-[0.15em] text-gold transition hover:bg-gold hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Wand2 size={13} /> Compila
              </button>
            </div>
          </section>

          {/* Dati */}
          <section className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="inst-name" className={label}>Nome e cognome *</label>
                <input id="inst-name" type="text" placeholder="Es. Mario Rossi" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className={field} />
              </div>
              <div>
                <label htmlFor="inst-phone" className={label}>Telefono</label>
                <input id="inst-phone" type="tel" inputMode="tel" placeholder="Es. 320 123 4567" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className={field} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="inst-date" className={label}>Data *</label>
                <input id="inst-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
              </div>
              <div>
                <label htmlFor="inst-time" className={label}>Orario *</label>
                <input id="inst-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className={field} />
              </div>
            </div>

            <div>
              <label htmlFor="inst-barber" className={label}>Barbiere</label>
              <select id="inst-barber" value={barberId} onChange={(e) => setBarberId(e.target.value)} className={field}>
                {barbers.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div>
              <span className={label}>Servizi (uno o più)</span>
              <div className="admin-modal-scroll mt-1 max-h-40 space-y-1 overflow-y-auto border border-gold/30 bg-black/50 p-2">
                {services.map((s) => {
                  const checked = selectedServiceIds.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className={`flex cursor-pointer items-center gap-2 px-2 py-1.5 text-sm transition ${
                        checked ? 'bg-gold/15 font-medium text-gold' : 'text-white/80 hover:bg-white/5'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          if (checked) {
                            if (selectedServiceIds.length > 1) setSelectedServiceIds(selectedServiceIds.filter((id) => id !== s.id));
                          } else {
                            setSelectedServiceIds([...selectedServiceIds, s.id]);
                          }
                        }}
                        className="h-4 w-4 accent-[#cd9a4f]"
                      />
                      <span>{s.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3 border border-gold/20 p-4">
              <label className="flex cursor-pointer select-none items-center gap-2">
                <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} className="h-4 w-4 accent-[#cd9a4f]" />
                <span className="text-sm font-medium text-white/90">Prenotazione ricorrente</span>
              </label>
              {isRecurring && (
                <div>
                  <label htmlFor="inst-recurrence-weeks" className={label}>Ripeti ogni settimana per</label>
                  <select id="inst-recurrence-weeks" value={recurrenceWeeks} onChange={(e) => setRecurrenceWeeks(Number(e.target.value))} className={field}>
                    {[2, 4, 6, 8, 12].map((w) => (
                      <option key={w} value={w}>{w} settimane ({w} appuntamenti)</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Pulsanti sempre visibili */}
        <div className="flex gap-3 border-t border-gold/25 bg-[#0c0a08] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-11 flex-1 border border-white/20 text-xs font-bold uppercase tracking-[0.2em] text-white/70 transition hover:border-white/40 hover:text-white"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={pending}
            className="inline-flex h-11 flex-1 items-center justify-center bg-gold text-xs font-bold uppercase tracking-[0.2em] text-black transition hover:bg-gold-light disabled:opacity-60"
          >
            {pending ? <Loader2 size={16} className="animate-spin" /> : 'Conferma'}
          </button>
        </div>
      </div>
    </div>
  );
}
