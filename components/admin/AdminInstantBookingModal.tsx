'use client';

import { useEffect, useState, useTransition } from 'react';
import { Mic, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { createAdminAppointment } from '@/lib/actions/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AdminInstantBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminInstantBookingModal({ isOpen, onClose }: AdminInstantBookingModalProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [barbers, setBarbers] = useState<{ id: string; name: string }[]>([]);
  const [services, setServices] = useState<{ id: string; name: string }[]>([]);

  // Form fields
  const [customerName, setCustomerName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('10:00');
  const [barberId, setBarberId] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceWeeks, setRecurrenceWeeks] = useState(4);

  // Speech Recognition state
  const [isListening, setIsListening] = useState(false);
  const [speechText, setSpeechText] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    // Pre-fill today's date
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setDate(`${yyyy}-${mm}-${dd}`);

    // Load barbers and services
    const supabase = createClient();
    if (!supabase) return;
    const fetchOptions = async () => {
      const { data: bData } = await supabase
        .from('barbers')
        .select('id, name')
        .eq('is_active', true);
      const { data: sData } = await supabase
        .from('services')
        .select('id, name')
        .eq('is_active', true);

      if (bData && bData.length > 0) {
        setBarbers(bData);
        setBarberId(bData[0].id);
      }
      if (sData && sData.length > 0) {
        setServices(sData);
        setSelectedServiceIds([sData[0].id]);
      }
    };
    fetchOptions();
  }, [isOpen]);

  if (!isOpen) return null;

  const startVoiceInput = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error('Il riconoscimento vocale non è supportato su questo browser. Prova con Google Chrome.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'it-IT';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setSpeechText('');
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSpeechText(transcript);

      const parsed = parseVoiceText(transcript);
      if (parsed.customerName) setCustomerName(parsed.customerName);
      if (parsed.dateStr) setDate(parsed.dateStr);
      if (parsed.timeStr) setTime(parsed.timeStr);

      toast.success('Voce riconosciuta ed elaborata!');
    };

    recognition.onerror = (e: any) => {
      console.error(e);
      toast.error('Errore nel riconoscimento vocale.');
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleSave = () => {
    if (!customerName.trim()) {
      toast.error('Inserisci il nome e cognome del cliente.');
      return;
    }
    if (!date) {
      toast.error('Inserisci la data.');
      return;
    }
    if (!time) {
      toast.error('Inserisci l\'orario.');
      return;
    }
    if (!barberId) {
      toast.error('Seleziona un barbiere.');
      return;
    }
    if (selectedServiceIds.length === 0) {
      toast.error('Seleziona almeno un servizio.');
      return;
    }

    startTransition(async () => {
      const result = await createAdminAppointment({
        serviceIds: selectedServiceIds,
        barberId,
        date,
        time,
        customerName: customerName.trim(),
        customerPhone: '',
        recurrenceWeeks: isRecurring ? recurrenceWeeks : 1,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      if (result.isRecurring) {
        const succ = result.successCount || 0;
        const fail = result.failedCount || 0;
        if (fail > 0) {
          toast.warning(`Prenotate ${succ} settimane su ${succ + fail}. Alcune date erano già occupate.`);
        } else {
          toast.success(`Prenotate con successo tutte le ${succ} settimane!`);
        }
      } else {
        toast.success('Prenotazione istantanea creata con successo!');
      }
      router.refresh();
      onClose();
    });
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 cursor-pointer"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-white/10 bg-[#111] p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 cursor-default"
      >
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <div>
              <h2 className="font-display text-lg uppercase tracking-wide text-gold font-bold">Prenotazione Istantanea</h2>
              <p className="text-xs text-white/50">Crea una prenotazione al volo</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-white/40 hover:bg-white/5 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Sezione Riconoscimento Vocale */}
        <div className="mt-5 rounded-lg border border-white/5 bg-white/[0.02] p-4 text-center">
          <button
            type="button"
            onClick={startVoiceInput}
            className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full transition-all ${
              isListening
                ? 'bg-red-600 text-white animate-pulse shadow-lg shadow-red-600/30'
                : 'bg-gold/15 text-gold border border-gold/30 hover:bg-gold/25'
            }`}
          >
            <Mic size={24} className={isListening ? 'animate-bounce' : ''} />
          </button>
          <p className="mt-2 text-xs font-semibold text-white/70">
            {isListening ? 'Sto ascoltando... Parla ora' : 'Usa il riconoscimento vocale'}
          </p>
          <p className="mt-1 text-[11px] text-white/40 max-w-[280px] mx-auto leading-relaxed">
            Clicca e dì ad esempio: <span className="italic text-gold/70">"Mario Rossi domani alle 15:30"</span>
          </p>
          {speechText && (
            <div className="mt-3 rounded border border-gold/10 bg-gold/5 p-2 text-left">
              <span className="text-[10px] uppercase font-bold text-gold/50 block">Testo Rilevato:</span>
              <p className="text-xs text-white/80 italic">"{speechText}"</p>
            </div>
          )}
        </div>

        {/* Form Fields */}
        <div className="mt-5 space-y-4">
          <div>
            <Label htmlFor="inst-name" className="text-xs text-white/60">Nome e Cognome del Cliente *</Label>
            <Input
              id="inst-name"
              type="text"
              placeholder="Es. Mario Rossi"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="mt-1 border-white/10 bg-black/40 text-sm focus:border-gold"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="inst-date" className="text-xs text-white/60">Data *</Label>
              <Input
                id="inst-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 border-white/10 bg-black/40 text-sm focus:border-gold"
              />
            </div>
            <div>
              <Label htmlFor="inst-time" className="text-xs text-white/60">Orario *</Label>
              <Input
                id="inst-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="mt-1 border-white/10 bg-black/40 text-sm focus:border-gold"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="inst-barber" className="text-xs text-white/60">Barbiere</Label>
              <select
                id="inst-barber"
                value={barberId}
                onChange={(e) => setBarberId(e.target.value)}
                className="mt-1 block w-full rounded-md border border-white/10 bg-black/80 px-3 py-2 text-sm text-white focus:border-gold focus:outline-none"
              >
                {barbers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs text-white/60">Servizi (seleziona uno o più)</Label>
              <div className="mt-1 max-h-36 overflow-y-auto border border-white/10 bg-black/40 rounded-md p-2 space-y-1.5 no-scrollbar">
                {services.map((s) => {
                  const isSelected = selectedServiceIds.includes(s.id);
                  return (
                    <label key={s.id} className="flex items-center gap-2.5 cursor-pointer hover:bg-white/5 p-1 rounded transition select-none">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          setSelectedServiceIds(prev => 
                            prev.includes(s.id) 
                              ? prev.filter(id => id !== s.id) 
                              : [...prev, s.id]
                          );
                        }}
                        className="rounded border-white/20 bg-black text-gold focus:ring-0 focus:ring-offset-0 h-4 w-4"
                      />
                      <span className="text-xs text-white/80">{s.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Recurrence fields */}
          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="rounded border-white/20 bg-black text-gold focus:ring-0 focus:ring-offset-0 h-4 w-4"
              />
              <span className="text-sm font-medium text-white/90">Prenotazione ricorrente</span>
            </label>
            
            {isRecurring && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <Label htmlFor="inst-recurrence-weeks" className="text-xs text-white/60">
                  Ripeti ogni settimana per:
                </Label>
                <select
                  id="inst-recurrence-weeks"
                  value={recurrenceWeeks}
                  onChange={(e) => setRecurrenceWeeks(Number(e.target.value))}
                  className="block w-full rounded-md border border-white/10 bg-black/80 px-3 py-2 text-sm text-white focus:border-gold focus:outline-none"
                >
                  <option value={2}>2 settimane (2 appuntamenti)</option>
                  <option value={4}>4 settimane (4 appuntamenti)</option>
                  <option value={6}>6 settimane (6 appuntamenti)</option>
                  <option value={8}>8 settimane (8 appuntamenti)</option>
                  <option value={12}>12 settimane (12 appuntamenti)</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="mt-6 flex gap-3 border-t border-white/5 pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="flex-1 border border-white/10 text-white/70 hover:bg-white/5 hover:text-white"
          >
            Annulla
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={pending}
            className="flex-1 bg-gold text-black hover:bg-gold-light font-bold"
          >
            {pending ? <Loader2 size={16} className="animate-spin" /> : 'Conferma'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// NLP parser for vocal text
function parseVoiceText(text: string) {
  const lowercase = text.toLowerCase();
  let dateStr = '';
  let timeStr = '';
  let customerName = '';

  // 1. Time parsing (e.g. 15:30, 10.15, alle 10, ore 12)
  const timeRegex = /(\d{1,2})[:.](\d{2})/;
  const timeMatch = lowercase.match(timeRegex);
  if (timeMatch) {
    const hh = timeMatch[1].padStart(2, '0');
    const mm = timeMatch[2];
    timeStr = `${hh}:${mm}`;
  } else {
    const hourRegex = /(?:alle|ore)\s+(\d{1,2})/;
    const hourMatch = lowercase.match(hourRegex);
    if (hourMatch) {
      const hh = hourMatch[1].padStart(2, '0');
      timeStr = `${hh}:00`;
    }
  }

  // 2. Date parsing (oggi, domani, dopodomani, dd/mm, dd mese)
  const today = new Date();
  if (lowercase.includes('oggi')) {
    dateStr = formatLocalDate(today);
  } else if (lowercase.includes('domani')) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateStr = formatLocalDate(tomorrow);
  } else if (lowercase.includes('dopodomani')) {
    const dopodomani = new Date(today);
    dopodomani.setDate(dopodomani.getDate() + 2);
    dateStr = formatLocalDate(dopodomani);
  } else {
    // Check 15/07 or 15-07
    const numDateRegex = /(\d{1,2})[\/-](\d{1,2})/;
    const numDateMatch = lowercase.match(numDateRegex);
    if (numDateMatch) {
      const day = numDateMatch[1].padStart(2, '0');
      const month = numDateMatch[2].padStart(2, '0');
      const year = today.getFullYear();
      dateStr = `${year}-${month}-${day}`;
    } else {
      // Check word date e.g. "15 luglio"
      const months = [
        'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
        'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'
      ];
      for (let i = 0; i < months.length; i++) {
        if (lowercase.includes(months[i])) {
          const dayRegex = new RegExp(`(\\d{1,2})\\s+(?:di\\s+)?${months[i]}`);
          const dayMatch = lowercase.match(dayRegex);
          if (dayMatch) {
            const day = dayMatch[1].padStart(2, '0');
            const month = String(i + 1).padStart(2, '0');
            const year = today.getFullYear();
            dateStr = `${year}-${month}-${day}`;
            break;
          }
        }
      }
    }
  }

  // Default to today if no date recognized
  if (!dateStr) {
    dateStr = formatLocalDate(today);
  }

  // 3. Name parsing - clean text of date/time info and prepositions
  let cleanText = text;
  if (timeMatch) cleanText = cleanText.replace(timeMatch[0], '');
  cleanText = cleanText.replace(/(?:alle|ore)\s+\d{1,2}(?:\s*[:.]\s*\d{2})?/gi, '');
  cleanText = cleanText.replace(/(oggi|domani|dopodomani)/gi, '');

  const months = [
    'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
    'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'
  ];
  months.forEach((m) => {
    const r = new RegExp(`\\d{1,2}\\s+(?:di\\s+)?${m}`, 'gi');
    cleanText = cleanText.replace(r, '');
  });
  cleanText = cleanText.replace(/\d{1,2}[\/-]\d{1,2}(?:[\/-]\d{2,4})?/gi, '');

  const stopWords = [
    'prenota', 'prenotazione', 'per', 'a', 'da', 'di', 'il', 'la', 'i', 'gli',
    'le', 'un', 'una', 'uno', 'ore', 'ora', 'alle', 'del', 'dello', 'della', 'con'
  ];

  const words = cleanText.split(/\s+/);
  const nameWords = words.filter((w) => {
    const lw = w.toLowerCase().replace(/[^a-zàèìòù]/g, '');
    return lw.length > 0 && !stopWords.includes(lw);
  });

  if (nameWords.length > 0) {
    customerName = nameWords.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  return { dateStr, timeStr, customerName };
}

function formatLocalDate(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
