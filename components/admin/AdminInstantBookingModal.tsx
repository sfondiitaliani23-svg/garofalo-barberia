'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Mic, Square, X, Loader2, Wand2, Check, CircleDashed, PenLine, ArrowLeft } from 'lucide-react';
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
  const [services, setServices] = useState<{ id: string; name: string; price_cents?: number | null }[]>([]);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('10:00');
  const [barberId, setBarberId] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceWeeks, setRecurrenceWeeks] = useState(4);

  // Schermata: voce (di partenza) oppure compilazione a mano in 3 passi
  const [mode, setMode] = useState<'voice' | 'manual'>('voice');
  const [step, setStep] = useState<1 | 2 | 3>(1);

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
    setMode('voice');
    setStep(1);

    const supabase = createClient();
    if (!supabase) return;
    (async () => {
      const { data: bData } = await supabase.from('barbers').select('id, name').eq('is_active', true);
      const { data: sData } = await supabase.from('services').select('id, name, price_cents').eq('is_active', true);
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
      const code = String(e?.error ?? '');
      // "aborted" capita quando fermo io il microfono (chiusura della finestra, nuovo avvio): non è un errore
      if (code === 'aborted') return;
      errored = true;
      toast.error(MIC_ERRORS[code] ?? `Il riconoscimento vocale non ha funzionato${code ? ` (${code})` : ''}. Riprova, oppure scrivi la frase qui sotto.`);
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

  const missing: string[] = [];
  if (!customerName.trim()) missing.push('nome');
  if (!date) missing.push('giorno');
  if (!time) missing.push('ora');
  if (!barberId) missing.push('barbiere');
  if (selectedServiceIds.length === 0) missing.push('servizio');

  const barberName = barbers.find((b) => b.id === barberId)?.name ?? '';
  const chosenServices = services.filter((s) => selectedServiceIds.includes(s.id));
  const total = chosenServices.reduce((sum, s) => sum + (s.price_cents ?? 0), 0);
  const euro = (cents: number) => `${(cents / 100).toFixed(2).replace('.', ',')} €`;
  const prettyDate = (() => {
    if (!date) return '';
    const d = new Date(`${date}T12:00:00`);
    return Number.isNaN(d.getTime()) ? date : d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
  })();

  const goManual = (to: 1 | 2 | 3) => {
    stopListening();
    setMode('manual');
    setStep(to);
  };

  const nextStep = () => {
    if (step === 1) {
      if (!customerName.trim()) return void toast.error('Inserisci il nome e cognome del cliente.');
      if (!date) return void toast.error('Inserisci la data.');
      if (!time) return void toast.error("Inserisci l'orario.");
      if (!barberId) return void toast.error('Seleziona un barbiere.');
      setStep(2);
    } else if (step === 2) {
      if (selectedServiceIds.length === 0) return void toast.error('Seleziona almeno un servizio.');
      setStep(3);
    }
  };

  const gold = 'border-gold/30 bg-black/50';
  const heardCards = heard
    ? [
        { key: 'cliente', title: 'Cliente', line1: heard.customerName || customerName, line2: heard.customerPhone || customerPhone, ok: !!heard.customerName, to: 1 as const, tone: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/5' },
        { key: 'quando', title: 'Quando', line1: prettyDate, line2: time ? `alle ${time}` : '', ok: !!heard.dateStr || !!heard.timeStr, to: 1 as const, tone: 'text-gold border-gold/45 bg-gold/5' },
        { key: 'barbiere', title: 'Barbiere', line1: barberName, line2: '', ok: !!heard.barberId, to: 1 as const, tone: 'text-sky-300 border-sky-400/40 bg-sky-400/5' },
        { key: 'servizio', title: 'Servizio', line1: chosenServices.map((s) => s.name).join(', '), line2: total ? euro(total) : '', ok: heard.serviceIds.length > 0, to: 2 as const, tone: 'text-pink-300 border-pink-400/40 bg-pink-400/5' },
      ]
    : [];

  const stepNames = ['Dati', 'Servizi', 'Riepilogo'];

  return (
    <div onClick={onClose} className="fixed inset-0 z-[250] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4">
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
            <p className="mt-0.5 text-xs text-white/50">{mode === 'voice' ? 'Parla: ai dati penso io.' : 'Compila in tre passi.'}</p>
          </div>
          <button onClick={onClose} aria-label="Chiudi" className="p-1 text-white/45 transition hover:text-white">
            <X size={18} />
          </button>
        </div>

        {mode === 'voice' ? (
          <>
            <div className="admin-modal-scroll min-h-0 flex-1 overflow-y-auto px-5 py-6">
              <div className="flex flex-col items-center text-center">
                <div className="relative flex h-36 w-36 items-center justify-center">
                  {isListening && (
                    <>
                      <span className="absolute inset-0 animate-ping rounded-full border border-red-500/30" />
                      <span className="absolute inset-3 rounded-full border border-red-500/45" />
                    </>
                  )}
                  <button
                    type="button"
                    onClick={startVoiceInput}
                    aria-label={isListening ? 'Ferma la registrazione' : 'Parla per compilare'}
                    className={`flex h-24 w-24 items-center justify-center rounded-full transition ${
                      isListening ? 'bg-red-600 text-white shadow-[0_0_40px_rgba(217,56,44,0.45)]' : 'bg-gold text-black shadow-[0_0_30px_rgba(205,154,79,0.25)] hover:bg-gold-light'
                    }`}
                  >
                    {isListening ? <Square size={32} /> : <Mic size={36} />}
                  </button>
                </div>
                <p className={`mt-1 text-xs font-semibold uppercase tracking-[0.18em] ${isListening ? 'text-red-400' : 'text-white/55'}`}>
                  {isListening ? 'Sto ascoltando… premi per fermare' : heard ? 'Premi per riprovare' : 'Premi il microfono e parla'}
                </p>
                {!speechText && !isListening && (
                  <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/50">
                    Dì nome, telefono, giorno, ora, barbiere e servizio. Esempio:{' '}
                    <span className="italic text-gold/80">&quot;Mario Rossi 320 123 4567 sabato alle dieci e mezza con Vittorio, taglio e shampoo&quot;</span>
                  </p>
                )}
              </div>

              <label htmlFor="inst-speech" className={`${label} mt-5`}>Frase (puoi correggerla o scriverla)</label>
              <textarea
                id="inst-speech"
                rows={2}
                value={speechText}
                onChange={(e) => setSpeechText(e.target.value)}
                placeholder="La frase compare qui mentre parli."
                className={`mt-1 block w-full resize-none border ${gold} px-3 py-2 text-base text-white placeholder:text-white/30 outline-none focus:border-gold`}
              />
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => speechText.trim() && runParse(speechText)}
                  disabled={!speechText.trim() || isListening}
                  className="inline-flex h-8 items-center gap-1.5 border border-gold/50 px-3 text-[11px] font-bold uppercase tracking-[0.15em] text-gold transition hover:bg-gold hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Wand2 size={13} /> Compila
                </button>
              </div>

              {heard && (
                <div className="mt-5" aria-live="polite">
                  <p className={label}>Ho capito</p>
                  <div className="mt-2 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {heardCards.map((c) => (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => goManual(c.to)}
                        className={`border px-3 py-2.5 text-left transition hover:brightness-125 ${c.ok ? c.tone : 'border-white/15 text-white/40'}`}
                      >
                        <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em]">
                          {c.ok ? <Check size={11} /> : <CircleDashed size={11} />} {c.title}
                        </span>
                        <span className="mt-0.5 block text-sm font-semibold text-white">{c.ok ? c.line1 || '—' : 'Non capito: tocca per scrivere'}</span>
                        {c.ok && c.line2 && <span className="block text-xs text-white/55">{c.line2}</span>}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-center text-xs text-white/45">
                    {missing.length > 0 ? `Mancano: ${missing.join(', ')}. Tocca una scheda per completare.` : 'Qualcosa non va? Tocca la scheda per correggerla.'}
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 border-t border-gold/25 px-5 py-4">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => goManual(1)}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 border border-white/20 text-xs font-bold uppercase tracking-[0.18em] text-white/70 transition hover:border-white/40 hover:text-white"
                >
                  <PenLine size={14} /> Scrivo io
                </button>
                <button
                  type="button"
                  onClick={() => (missing.length === 0 ? goManual(3) : goManual(missing.includes('servizio') && !missing.includes('nome') ? 2 : 1))}
                  disabled={!heard}
                  className="inline-flex h-11 flex-[1.4] items-center justify-center bg-gold text-xs font-bold uppercase tracking-[0.2em] text-black transition hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {missing.length === 0 ? 'Vai al riepilogo' : 'Completa i dati'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Passi */}
            <div className="flex items-center px-5 pb-1 pt-4" aria-label="Passi">
              {stepNames.map((n, i) => {
                const num = (i + 1) as 1 | 2 | 3;
                const done = step > num;
                const current = step === num;
                return (
                  <div key={n} className="flex flex-1 items-center last:flex-none">
                    <button
                      type="button"
                      onClick={() => done && setStep(num)}
                      disabled={!done}
                      className="flex items-center gap-2 disabled:cursor-default"
                    >
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                          done ? 'bg-gold text-black' : current ? 'border-2 border-gold text-gold' : 'border border-gold/35 text-white/35'
                        }`}
                      >
                        {done ? <Check size={12} /> : num}
                      </span>
                      <span className={`text-xs font-semibold ${current ? 'text-white' : done ? 'text-gold' : 'text-white/35'}`}>{n}</span>
                    </button>
                    {i < 2 && <span className={`mx-3 h-px flex-1 ${done ? 'bg-gold' : 'bg-gold/25'}`} />}
                  </div>
                );
              })}
            </div>

            <div className="admin-modal-scroll min-h-0 flex-1 overflow-y-auto px-5 py-5">
              {step === 1 && (
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
                    <span className={label}>Barbiere</span>
                    <div className="mt-1 grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(1, Math.min(barbers.length, 3))}, minmax(0, 1fr))` }}>
                      {barbers.map((b) => {
                        const on = b.id === barberId;
                        return (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => setBarberId(b.id)}
                            aria-pressed={on}
                            className={`h-11 border text-sm transition ${on ? 'border-gold bg-gold/15 font-semibold text-gold-light' : 'border-gold/25 text-white/65 hover:border-gold/50'}`}
                          >
                            {b.name.split(' ')[0]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </section>
              )}

              {step === 2 && (
                <section className="space-y-4">
                  <div className="bg-[#f3ead6] px-5 py-4 font-mono text-[#1a140c]">
                    <p className="text-center text-xs font-bold uppercase tracking-[0.2em]">Servizi</p>
                    <div className="my-3 border-t-2 border-dashed border-[#1a140c]" />
                    {chosenServices.length === 0 ? (
                      <p className="text-sm opacity-60">Scegli almeno un servizio qui sotto.</p>
                    ) : (
                      <ul className="space-y-1.5 text-sm">
                        {chosenServices.map((s) => (
                          <li key={s.id} className="flex justify-between gap-3">
                            <span>1 x {s.name}</span>
                            <span className="font-bold">{s.price_cents != null ? (s.price_cents / 100).toFixed(2).replace('.', ',') : ''}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="my-3 border-t-2 border-[#1a140c]" />
                    <div className="flex justify-between text-base font-bold">
                      <span>TOTALE</span>
                      <span>{euro(total)}</span>
                    </div>
                  </div>

                  <div>
                    <span className={label}>Tocca per aggiungere o togliere</span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {services.map((sv) => {
                        const on = selectedServiceIds.includes(sv.id);
                        return (
                          <button
                            key={sv.id}
                            type="button"
                            aria-pressed={on}
                            onClick={() => {
                              if (on) {
                                if (selectedServiceIds.length > 1) setSelectedServiceIds(selectedServiceIds.filter((id) => id !== sv.id));
                              } else setSelectedServiceIds([...selectedServiceIds, sv.id]);
                            }}
                            className={`h-9 border px-3.5 text-sm transition ${on ? 'border-gold bg-gold/15 font-semibold text-gold-light' : 'border-gold/25 text-white/65 hover:border-gold/50'}`}
                          >
                            {sv.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-3 border border-gold/20 p-4">
                    <label className="flex cursor-pointer select-none items-center gap-2">
                      <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} className="h-4 w-4 accent-[#cd9a4f]" />
                      <span className="text-sm font-medium text-white/90">Ripeti ogni settimana</span>
                    </label>
                    {isRecurring && (
                      <div>
                        <label htmlFor="inst-recurrence-weeks" className={label}>Per quante settimane</label>
                        <select id="inst-recurrence-weeks" value={recurrenceWeeks} onChange={(e) => setRecurrenceWeeks(Number(e.target.value))} className={field}>
                          {[2, 4, 6, 8, 12].map((w) => (
                            <option key={w} value={w}>{w} settimane ({w} appuntamenti)</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {step === 3 && (
                <section className="border border-gold/40 bg-[#110d09]">
                  <div className="flex items-center gap-2 border-b border-gold/20 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-gold">
                    <Check size={14} className="text-emerald-400" /> Controlla e conferma
                  </div>
                  <ul className="space-y-3 px-4 py-4 text-sm">
                    {[
                      { t: 'Cliente', v: customerName || '—', sub: customerPhone, to: 1 as const },
                      { t: 'Quando', v: `${prettyDate || '—'}${time ? `, ore ${time}` : ''}`, sub: isRecurring ? `Ogni settimana per ${recurrenceWeeks} settimane` : '', to: 1 as const },
                      { t: 'Barbiere', v: barberName || '—', sub: '', to: 1 as const },
                      { t: 'Servizi', v: chosenServices.map((x) => x.name).join(', ') || '—', sub: total ? euro(total) : '', to: 2 as const },
                    ].map((r) => (
                      <li key={r.t} className="flex items-start gap-3">
                        <span className="w-20 shrink-0 pt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">{r.t}</span>
                        <span className="flex-1">
                          <span className="block font-semibold text-white">{r.v}</span>
                          {r.sub && <span className="block text-xs text-white/55">{r.sub}</span>}
                        </span>
                        <button type="button" onClick={() => setStep(r.to)} className="text-[11px] uppercase tracking-[0.1em] text-gold hover:underline">Cambia</button>
                      </li>
                    ))}
                  </ul>
                  {missing.length > 0 && <p className="border-t border-gold/20 px-4 py-3 text-xs text-amber-300">Mancano: {missing.join(', ')}.</p>}
                </section>
              )}
            </div>

            <div className="flex gap-3 border-t border-gold/25 px-5 py-4">
              <button
                type="button"
                onClick={() => (step === 1 ? setMode('voice') : setStep((step - 1) as 1 | 2))}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 border border-white/20 text-xs font-bold uppercase tracking-[0.2em] text-white/70 transition hover:border-white/40 hover:text-white"
              >
                <ArrowLeft size={14} /> {step === 1 ? 'Voce' : 'Indietro'}
              </button>
              {step < 3 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="inline-flex h-11 flex-[1.4] items-center justify-center bg-gold text-xs font-bold uppercase tracking-[0.2em] text-black transition hover:bg-gold-light"
                >
                  Avanti
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={pending || missing.length > 0}
                  className="inline-flex h-11 flex-[1.4] items-center justify-center bg-gold text-xs font-bold uppercase tracking-[0.2em] text-black transition hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {pending ? <Loader2 size={16} className="animate-spin" /> : 'Conferma'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
