'use client';

import { useState } from 'react';
import { Search, Calendar, User, Scissors, MessageSquare, ChevronDown, ChevronUp, Phone, MessageCircle } from 'lucide-react';
import { getWhatsAppLink } from '@/lib/site-config';

interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

const FAQ_DATA: FAQItem[] = [
  {
    id: '1',
    category: 'prenotazioni',
    question: 'Come posso modificare o cancellare una prenotazione?',
    answer: 'Puoi modificare o disdire un appuntamento autonomamente fino a 30 minuti prima dall\'inizio del servizio direttamente dalla tua Area Cliente, nella sezione "Appuntamenti". Seleziona l\'appuntamento desiderato e clicca su "Modifica" o "Disdici". Per modifiche urgenti a ridosso dell\'orario, ti preghiamo di chiamarci direttamente al salone.',
  },
  {
    id: '2',
    category: 'prenotazioni',
    question: 'Posso prenotare per più persone contemporaneamente?',
    answer: 'Attualmente il sistema di prenotazione online supporta una prenotazione alla volta per garantire la corretta allocazione dei tempi dei nostri barbieri. Se desideri prenotare per te e per tuo figlio o un amico, puoi effettuare due prenotazioni separate o contattarci telefonicamente per pianificare al meglio gli orari.',
  },
  {
    id: '3',
    category: 'account',
    question: 'Cos\'è il login rapido tramite Passkey?',
    answer: 'La Passkey ti consente di accedere al tuo account in modo sicuro e ultra-rapido utilizzando il riconoscimento facciale o l\'impronta digitale del tuo telefono o computer, senza dover digitare alcuna password. Puoi configurarla al primo login per un\'esperienza senza intoppi.',
  },
  {
    id: '4',
    category: 'account',
    question: 'I miei dati personali e il mio storico sono al sicuro?',
    answer: 'Assolutamente sì. Utilizziamo Supabase come backend sicuro con crittografia dei dati e autenticazione a doppio livello. I tuoi dati personali, il tuo storico dei tagli e le tue preferenze non verranno mai condivisi con terze parti.',
  },
  {
    id: '5',
    category: 'servizi',
    question: 'Offrite tagli per bambini e ragazzi?',
    answer: 'Sì, la Barberia Garofalo accoglie l\'uomo di ogni età! Abbiamo tariffe speciali e servizi dedicati per Ragazzi (stile moderno e sfumature trend) e Bimbi (tagli con cura, pazienza e un ambiente sereno per far sentire i piccoli a proprio agio).',
  },
  {
    id: '6',
    category: 'servizi',
    question: 'Come posso usufruire di sconti e promozioni?',
    answer: 'Tutte le promozioni attive e i codici sconto personali vengono mostrati nella sezione "Promozioni" dell\'area riservata o inviati tramite i nostri canali dedicati. Inoltre, registrandoti partecipi automaticamente al nostro programma fedeltà.',
  },
  {
    id: '7',
    category: 'contatti',
    question: 'Quali sono gli orari di apertura e dove vi trovate?',
    answer: 'Siamo a Foggia in Viale Ignazio D\'Addedda, 236. Siamo aperti dal Martedì al Venerdì dalle 09:00 alle 13:00 e dalle 14:00 alle 19:30, e il Sabato dalle 09:00 alle 13:00 e dalle 14:00 alle 18:00. Lunedì e Domenica siamo chiusi.',
  },
  {
    id: '8',
    category: 'contatti',
    question: 'Come posso contattarvi se ho un problema con la prenotazione?',
    answer: 'Puoi cliccare sul pulsante di assistenza immediata WhatsApp in basso a sinistra per scriverci un messaggio istantaneo, oppure puoi chiamarci direttamente al numero di telefono del salone (+39 0881 XXXXXX). Saremo felici di aiutarti a risolvere qualsiasi imprevisto.',
  },
];

const CATEGORIES = [
  { id: 'all', label: 'Tutti i temi', icon: MessageSquare },
  { id: 'prenotazioni', label: 'Gestione Prenotazioni', icon: Calendar },
  { id: 'account', label: 'Account & Sicurezza', icon: User },
  { id: 'servizi', label: 'Listino & Trattamenti', icon: Scissors },
];

export default function CustomerCarePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  const toggleFAQ = (id: string) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  const filteredFAQs = FAQ_DATA.filter((faq) => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    const matchesSearch =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-4xl mx-auto pb-12">
      {/* Intestazione */}
      <div className="text-center py-8">
        <h1 className="font-display text-3xl uppercase text-white tracking-wide">Assistenza Clienti</h1>
        <p className="mt-2 text-white/50">Come possiamo aiutarti oggi? Cerca tra le domande frequenti o contattaci.</p>
      </div>

      {/* Barra di ricerca */}
      <div className="relative mt-4 max-w-xl mx-auto">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-white/40" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cerca argomenti, es. cancellare prenotazione, passkey..."
          className="block w-full pl-10 pr-4 py-3 border border-white/10 rounded-xl bg-[#111] text-white placeholder-white/40 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all shadow-lg"
        />
      </div>

      {/* Categorie in griglia */}
      <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(cat.id);
                setExpandedFAQ(null);
              }}
              type="button"
              className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                isActive
                  ? 'border-gold bg-gold/10 text-gold shadow-[0_10px_30px_rgba(205,154,79,0.1)]'
                  : 'border-white/10 bg-[#111] text-white/70 hover:border-white/20 hover:text-white'
              }`}
            >
              <Icon className="h-6 w-6 mb-2" />
              <span className="text-xs font-semibold text-center uppercase tracking-wider">{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Sezione Domande Frequenti (FAQ) */}
      <div className="mt-12 bg-[#111] rounded-xl border border-white/10 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
        <h2 className="font-display text-lg uppercase text-gold mb-6 border-b border-white/5 pb-3">Domande frequenti</h2>

        {filteredFAQs.length > 0 ? (
          <div className="divide-y divide-white/5">
            {filteredFAQs.map((faq) => {
              const isExpanded = expandedFAQ === faq.id;
              return (
                <div key={faq.id} className="py-4 first:pt-0 last:pb-0">
                  <button
                    onClick={() => toggleFAQ(faq.id)}
                    className="w-full flex items-center justify-between text-left font-medium text-white hover:text-gold transition-colors focus:outline-none py-2"
                  >
                    <span>{faq.question}</span>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-gold flex-shrink-0 ml-2" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-white/40 flex-shrink-0 ml-2" />
                    )}
                  </button>
                  {isExpanded && (
                    <div className="mt-3 text-sm text-white/70 leading-relaxed pl-1 animate-in fade-in slide-in-from-top-1 duration-200">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-white/40 text-center py-6">
            Nessuna risposta trovata per i criteri inseriti. Prova a cambiare parole chiave o seleziona un'altra categoria.
          </p>
        )}
      </div>

      {/* Contatto Diretto in stile Treatwell */}
      <div className="mt-8 rounded-xl border border-gold/20 bg-gradient-to-br from-[#111] to-[#151515] p-6 text-center shadow-[0_10px_30px_rgba(205,154,79,0.05)]">
        <h3 className="text-base font-bold text-white uppercase tracking-wider">Non hai trovato quello che cercavi?</h3>
        <p className="mt-1 text-sm text-white/50 max-w-lg mx-auto">
          Il team della Barberia Garofalo è sempre a tua disposizione per risolvere qualsiasi dubbio o esigenza particolare.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-4">
          <a
            href={getWhatsAppLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#25D366] hover:bg-[#20ba5a] text-black font-semibold text-sm transition-all shadow-[0_4px_12px_rgba(37,211,102,0.2)]"
          >
            <MessageCircle className="h-4 w-4 fill-black" />
            <span>Scrivici su WhatsApp</span>
          </a>
          <a
            href="tel:+390881236236" // Numero fittizio o del salone
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#25D366] hover:bg-[#20ba5a] text-black font-semibold text-sm transition-all shadow-[0_4px_12px_rgba(37,211,102,0.2)]"
          >
            <Phone className="h-4 w-4" />
            <span>Chiamaci in Salone</span>
          </a>
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent('eliseo-chat-open'));
            }}
            type="button"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#25D366] hover:bg-[#20ba5a] text-black font-semibold text-sm transition-all shadow-[0_4px_12px_rgba(37,211,102,0.2)]"
          >
            <Scissors className="h-4 w-4" />
            <span>Chiedi a Eliseo ( Il nostro agente AI )</span>
          </button>
        </div>
      </div>
    </div>
  );
}
