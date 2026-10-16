'use client';

import { useState } from 'react';
import { Search, Calendar, User, Scissors, MessageSquare, ChevronDown, ChevronUp, Phone, MessageCircle } from 'lucide-react';
import { getWhatsAppLink } from '@/lib/site-config';
import { useLang } from '@/components/i18n/LangProvider';
import { L } from '@/lib/i18n';
import { PageHeader } from '@/components/customer/PageHeader';
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
      <PageHeader
        center
        eyebrow={L(lang, 'Siamo qui', 'We are here')}
        title={L(lang, 'Assistenza Clienti', 'Customer Support')}
        subtitle={L(lang, 'Come possiamo aiutarti oggi? Cerca tra le domande frequenti o contattaci.', 'How can we help you today? Search the frequently asked questions or get in touch.')}
      />

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
          className="block w-full pl-10 pr-4 py-3 border border-gold/40 bg-black/40 text-white placeholder-white/40 focus:outline-none focus:border-gold transition-all"
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
              className={`flex flex-col items-center justify-center p-4 border transition-all ${
                isActive
                  ? 'border-gold bg-gold text-[#0a0807]'
                  : 'border-gold/35 bg-black/25 text-[#bda980] hover:border-gold hover:text-gold'
              }`}
            >
              <Icon className="h-6 w-6 mb-2" />
              <span className="text-xs font-semibold text-center uppercase tracking-wider">{careCategoryLabel(lang, cat.id)}</span>
            </button>
          );
        })}
      </div>

      {/* Sezione Domande Frequenti (FAQ) */}
      <div className="mt-12 border border-gold/45 bg-black/30 p-6">
        <h2 className="font-display text-2xl text-gold mb-6 border-b border-dashed border-gold/30 pb-3">{L(lang, 'Domande frequenti', 'Frequently asked questions')}</h2>

        {filteredFAQs.length > 0 ? (
          <div className="divide-y divide-dashed divide-gold/25">
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
      <div className="mt-8 border border-gold/55 bg-black/35 p-1.5">
        <div className="border border-gold/30 bg-gradient-to-b from-[#1a140e]/95 to-[#0c0a08]/95 p-6 text-center">
        <h3 className="font-display text-xl text-gold">{L(lang, 'Non hai trovato quello che cercavi?', "Couldn't find what you were looking for?")}</h3>
        <p className="mt-1 text-sm text-white/50 max-w-lg mx-auto">
          {L(lang, 'Il team della Barberia Garofalo è sempre a tua disposizione per risolvere qualsiasi dubbio o esigenza particolare.', 'The Barberia Garofalo team is always here to help with any question or special request.')}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-4">
          <a
            href={getWhatsAppLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 border border-gold text-gold hover:bg-gold hover:text-[#0a0807] font-bold text-xs uppercase tracking-[0.18em] transition-all"
          >
            <MessageCircle className="h-4 w-4" />
            <span>{L(lang, 'Scrivici su WhatsApp', 'Message us on WhatsApp')}</span>
          </a>
          <a
            href="tel:+390881236236" // Numero fittizio o del salone
            className="inline-flex items-center gap-2 px-5 py-3 border border-gold text-gold hover:bg-gold hover:text-[#0a0807] font-bold text-xs uppercase tracking-[0.18em] transition-all"
          >
            <Phone className="h-4 w-4" />
            <span>{L(lang, 'Chiamaci in Salone', 'Call the barbershop')}</span>
          </a>
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent('eliseo-chat-open'));
            }}
            type="button"
            className="inline-flex items-center gap-2 px-5 py-3 border border-gold text-gold hover:bg-gold hover:text-[#0a0807] font-bold text-xs uppercase tracking-[0.18em] transition-all"
          >
            <Scissors className="h-4 w-4" />
            <span>{L(lang, 'Chiedi a Eliseo ( Il nostro agente AI )', 'Ask Eliseo (our AI agent)')}</span>
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
