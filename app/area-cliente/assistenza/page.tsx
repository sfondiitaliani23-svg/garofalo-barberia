'use client';

import { useState } from 'react';
import { Search, Calendar, User, Scissors, MessageSquare, ChevronDown, ChevronUp, Phone, MessageCircle } from 'lucide-react';
import { getWhatsAppLink } from '@/lib/site-config';
import { useLang } from '@/components/i18n/LangProvider';
import { L } from '@/lib/i18n';
import { careCategoryLabel, careFaqs } from '@/lib/i18n/content-customer';

const CATEGORIES = [
  { id: 'all', icon: MessageSquare },
  { id: 'prenotazioni', icon: Calendar },
  { id: 'account', icon: User },
  { id: 'servizi', icon: Scissors },
];

export default function CustomerCarePage() {
  const lang = useLang();
  const FAQ_DATA = careFaqs(lang);
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
        <h1 className="font-display text-3xl uppercase text-white tracking-wide">{L(lang, 'Assistenza Clienti', 'Customer Support')}</h1>
        <p className="mt-2 text-white/50">{L(lang, 'Come possiamo aiutarti oggi? Cerca tra le domande frequenti o contattaci.', 'How can we help you today? Search the frequently asked questions or get in touch.')}</p>
      </div>

      {/* Barra di ricerca */}
      <div className="relative mt-4 max-w-xl mx-auto">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-white/60" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={L(lang, 'Cerca argomenti, es. cancellare prenotazione, passkey...', 'Search topics, e.g. cancel booking, passkey...')}
          aria-label={L(lang, 'Cerca nelle domande frequenti', 'Search the frequently asked questions')}
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
              <span className="text-xs font-semibold text-center uppercase tracking-wider">{careCategoryLabel(lang, cat.id)}</span>
            </button>
          );
        })}
      </div>

      {/* Sezione Domande Frequenti (FAQ) */}
      <div className="mt-12 bg-[#111] rounded-xl border border-white/10 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
        <h2 className="font-display text-lg uppercase text-gold mb-6 border-b border-white/5 pb-3">{L(lang, 'Domande frequenti', 'Frequently asked questions')}</h2>

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
                      <ChevronDown className="h-4 w-4 text-white/60 flex-shrink-0 ml-2" />
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
          <p className="text-sm text-white/60 text-center py-6">
            {L(lang, "Nessuna risposta trovata per i criteri inseriti. Prova a cambiare parole chiave o seleziona un'altra categoria.", 'No answers found for your search. Try different keywords or choose another category.')}
          </p>
        )}
      </div>

      {/* Contatto Diretto in stile Treatwell */}
      <div className="mt-8 rounded-xl border border-gold/20 bg-gradient-to-br from-[#111] to-[#151515] p-6 text-center shadow-[0_10px_30px_rgba(205,154,79,0.05)]">
        <h3 className="text-base font-bold text-white uppercase tracking-wider">{L(lang, 'Non hai trovato quello che cercavi?', "Couldn't find what you were looking for?")}</h3>
        <p className="mt-1 text-sm text-white/50 max-w-lg mx-auto">
          {L(lang, 'Il team della Barberia Garofalo è sempre a tua disposizione per risolvere qualsiasi dubbio o esigenza particolare.', 'The Barberia Garofalo team is always here to help with any question or special request.')}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-4">
          <a
            href={getWhatsAppLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#25D366] hover:bg-[#20ba5a] text-black font-semibold text-sm transition-all shadow-[0_4px_12px_rgba(37,211,102,0.2)]"
          >
            <MessageCircle className="h-4 w-4 fill-black" />
            <span>{L(lang, 'Scrivici su WhatsApp', 'Message us on WhatsApp')}</span>
          </a>
          <a
            href="tel:+390881236236" // Numero fittizio o del salone
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#25D366] hover:bg-[#20ba5a] text-black font-semibold text-sm transition-all shadow-[0_4px_12px_rgba(37,211,102,0.2)]"
          >
            <Phone className="h-4 w-4" />
            <span>{L(lang, 'Chiamaci in Salone', 'Call the barbershop')}</span>
          </a>
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent('eliseo-chat-open'));
            }}
            type="button"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#25D366] hover:bg-[#20ba5a] text-black font-semibold text-sm transition-all shadow-[0_4px_12px_rgba(37,211,102,0.2)]"
          >
            <Scissors className="h-4 w-4" />
            <span>{L(lang, 'Chiedi a Eliseo ( Il nostro agente AI )', 'Ask Eliseo (our AI agent)')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
