'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Send, Scissors, RotateCcw, ChevronDown, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { SITE_CONFIG } from '@/lib/site-config';

interface ChatAction {
  label: string;
  href: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actions?: ChatAction[];
}

const WELCOME: Message = {
  id: '0',
  role: 'assistant',
  content: 'Ciao! 👋 Sono **Eliseo**, l\'assistente virtuale della Barberia Garofalo.\n\nPosso aiutarti con:\n• Orari e prenotazioni\n• Servizi e prezzi\n• Disdette e modifiche\n• Come raggiungerci',
};

const QUICK_QUESTIONS = [
  'Quali sono gli orari?',
  'Quanto costa un taglio?',
  'Come prenoto?',
  'Dove siete?',
];

const URL_RE = /(https?:\/\/[^\s)]+)/g;

export function EliseoChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(QUICK_QUESTIONS);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pathname = usePathname();
  const isCustomerArea = pathname?.startsWith('/area-cliente') ?? false;
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [hint, setHint] = useState(false);

  // Alla prima visita della sessione il fumetto "Chiedi a Eliseo" compare per qualche secondo
  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem('gb_ai_hint') === '1';
    } catch {
      /* archiviazione non disponibile */
    }
    if (seen) return;
    const show = setTimeout(() => {
      setHint(true);
      try {
        sessionStorage.setItem('gb_ai_hint', '1');
      } catch {
        /* archiviazione non disponibile */
      }
    }, 2500);
    const hide = setTimeout(() => setHint(false), 7500);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollToTop(true);
      } else {
        setShowScrollToTop(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setUnread(false);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('eliseo-chat-open', handleOpen);
    return () => window.removeEventListener('eliseo-chat-open', handleOpen);
  }, []);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSuggestions([]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          history: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();

      const replies: string[] =
        Array.isArray(data.replies) && data.replies.length > 0 ? data.replies : ['Mi dispiace, riprova tra poco.'];
      const actions: ChatAction[] = Array.isArray(data.actions) ? data.actions : [];

      for (let i = 0; i < replies.length; i++) {
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 450));
        }
        const isLast = i === replies.length - 1;
        const botMsg: Message = {
          id: `${Date.now()}-${i}`,
          role: 'assistant',
          content: replies[i],
          actions: isLast ? actions : undefined,
        };
        setMessages(prev => [...prev, botMsg]);
      }

      setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
      if (!isOpen) setUnread(true);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Scusami, si è verificato un errore. Contattaci su WhatsApp al **${SITE_CONFIG.phoneDisplay}** 📱`,
          actions: [{ label: 'Scrivi su WhatsApp', href: `https://wa.me/${SITE_CONFIG.whatsapp}` }],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const resetChat = () => {
    setMessages([{ ...WELCOME, id: Date.now().toString() }]);
    setSuggestions(QUICK_QUESTIONS);
  };

  /** Testo con link cliccabili */
  const renderLinks = (text: string, keyPrefix: string) =>
    text.split(URL_RE).map((chunk, k) =>
      /^https?:\/\//.test(chunk) ? (
        <a
          key={`${keyPrefix}-${k}`}
          href={chunk}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-[#cd9a4f]/50 underline-offset-2 break-all hover:text-[#e5b565]"
        >
          {chunk}
        </a>
      ) : (
        chunk
      )
    );

  /** Render a single message bubble */
  const renderContent = (text: string) =>
    text.split('\n').map((line, i) => {
      // Bold: **text**
      const parts = line.split(/\*\*(.*?)\*\*/g);
      return (
        <p key={i} className={cn(i > 0 && 'mt-0.5', line === '' && 'h-2')}>
          {parts.map((part, j) =>
            j % 2 === 1 ? <strong key={j}>{renderLinks(part, `${i}-${j}`)}</strong> : renderLinks(part, `${i}-${j}`)
          )}
        </p>
      );
    });

  const actionClass =
    'inline-flex items-center text-[11px] font-semibold px-3 py-1.5 rounded-full bg-[#cd9a4f]/15 border border-[#cd9a4f]/40 text-[#e5b565] hover:bg-[#cd9a4f] hover:text-black transition-all';

  const renderAction = (a: ChatAction) => {
    const internal = a.href.startsWith('/');
    if (internal) {
      return (
        <Link key={a.href} href={a.href} onClick={() => setIsOpen(false)} className={actionClass}>
          {a.label}
        </Link>
      );
    }
    return (
      <a key={a.href} href={a.href} target={a.href.startsWith('tel:') ? undefined : '_blank'} rel="noopener noreferrer" className={actionClass}>
        {a.label}
      </a>
    );
  };

  return (
    <>
      {/* ── Chat window ── */}
      <div
        className={cn(
          "fixed z-[301] w-[340px] max-w-[calc(100vw-2rem)] rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.7)] border border-gold/20 overflow-hidden flex flex-col bg-[#090909] transition-all duration-300 origin-bottom-right right-4",
          isCustomerArea
            ? (showScrollToTop
                ? "bottom-[calc(13.25rem+env(safe-area-inset-bottom))] lg:bottom-[calc(9.25rem+env(safe-area-inset-bottom))]"
                : "bottom-[calc(10rem+env(safe-area-inset-bottom))] lg:bottom-[calc(6.5rem+env(safe-area-inset-bottom))]")
            : (showScrollToTop
                ? "bottom-[calc(9.25rem+env(safe-area-inset-bottom))]"
                : "bottom-[calc(6.5rem+env(safe-area-inset-bottom))]"),
          isOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-90 pointer-events-none'
        )}
        style={{ maxHeight: '540px' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#111] to-[#0e0e0e] border-b border-gold/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#cd9a4f] to-[#8f6520] flex items-center justify-center shadow-[0_0_14px_rgba(205,154,79,0.45)]">
                <Scissors size={16} className="text-black" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#111]" />
            </div>
            <div>
              <p className="font-bold text-white text-sm leading-none">Eliseo</p>
              <p className="text-[10px] text-[#cd9a4f]/60 leading-none mt-0.5">Assistente Barberia Garofalo</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={resetChat} title="Nuova chat" aria-label="Nuova chat" className="text-white/55 hover:text-white transition-colors p-1">
              <RotateCcw size={13} />
            </button>
            <button onClick={() => setIsOpen(false)} aria-label="Chiudi assistente" className="text-white/55 hover:text-white transition-colors p-1">
              <ChevronDown size={18} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-3 eliseo-chat-messages">
          {messages.map(msg => (
            <div key={msg.id}>
            <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#cd9a4f] to-[#8f6520] flex items-center justify-center shrink-0 mr-2 mt-0.5">
                  <Scissors size={10} className="text-black" />
                </div>
              )}
              <div
                className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#cd9a4f] text-black font-medium rounded-br-sm'
                    : 'bg-[#161616] text-white border border-white/5 rounded-bl-sm'
                }`}
              >
                {renderContent(msg.content)}
              </div>
            </div>
            {msg.actions && msg.actions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2 ml-8">
                {msg.actions.map(renderAction)}
              </div>
            )}
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="flex justify-start items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#cd9a4f] to-[#8f6520] flex items-center justify-center shrink-0">
                <Scissors size={10} className="text-black" />
              </div>
              <div className="bg-[#161616] border border-white/5 rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1 items-center">
                  {[0, 150, 300].map(delay => (
                    <span
                      key={delay}
                      className="w-1.5 h-1.5 bg-[#cd9a4f]/60 rounded-full animate-bounce"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggerimenti */}
        {!loading && suggestions.length > 0 && (
          <div className="px-3 pb-2 flex flex-wrap gap-1.5 shrink-0">
            {suggestions.map(q => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="text-[11px] px-2.5 py-1 rounded-full border border-[#cd9a4f]/25 text-[#cd9a4f]/80 hover:bg-[#cd9a4f]/10 hover:border-[#cd9a4f]/50 transition-all"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2 px-3 py-3 border-t border-white/5 bg-[#0e0e0e] shrink-0">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Scrivi un messaggio..."
            maxLength={500}
            disabled={loading}
            className="flex-1 bg-[#1a1a1a] border border-white/10 rounded-full px-4 py-2 text-sm text-white placeholder:text-white/60 focus:outline-none focus:border-[#cd9a4f]/40 transition-colors"
          />
          <button
            type="submit"
            aria-label="Invia messaggio"
            disabled={!input.trim() || loading}
            className="w-9 h-9 rounded-full bg-[#cd9a4f] hover:bg-[#e5b565] disabled:bg-white/8 disabled:cursor-not-allowed text-black flex items-center justify-center transition-all shrink-0 shadow-lg"
          >
            <Send size={14} className={!input.trim() || loading ? 'opacity-30' : ''} />
          </button>
        </form>
        <p className="shrink-0 bg-[#0e0e0e] px-4 pb-2 text-center text-[10px] leading-snug text-white/45">
          Risposte automatiche, anche con AI. Non scrivere dati personali ·{' '}
          <a href="/privacy" className="underline underline-offset-2 hover:text-white/70">Privacy</a>
        </p>
      </div>

      {/* ── FAB toggle button ── */}
      <button
        id="eliseo-chat-btn"
        onClick={() => setIsOpen(o => !o)}
        aria-label={isOpen ? "Chiudi assistente Eliseo" : "Apri assistente Eliseo"}
        data-evt="assistente"
        className={cn(
          "fixed z-[302] group flex flex-col items-center transition-all duration-300 right-6",
          isCustomerArea
            ? (showScrollToTop
                ? "bottom-[calc(8.75rem+env(safe-area-inset-bottom))] lg:bottom-[calc(4.75rem+env(safe-area-inset-bottom))]"
                : "bottom-[calc(5.5rem+env(safe-area-inset-bottom))] lg:bottom-[calc(1.5rem+env(safe-area-inset-bottom))]")
            : (showScrollToTop
                ? "bottom-[calc(4.75rem+env(safe-area-inset-bottom))]"
                : "bottom-[calc(1.5rem+env(safe-area-inset-bottom))]")
        )}
      >
        {/* Fumetto "Chiedi a Eliseo": al passaggio del mouse e per pochi secondi alla prima visita */}
        {!isOpen && (
          <span className={cn('ai-fab-hint', hint && 'is-shown')} aria-hidden>
            Chiedi a <strong>Eliseo</strong>
          </span>
        )}
        <span className={cn('ai-fab', isOpen && 'is-open')}>
          <span className="ai-fab-ring" aria-hidden />
          <span className="ai-fab-core">
            {isOpen ? <X size={22} className="text-[#f0c378]" /> : <Sparkles size={22} className="ai-fab-icon" />}
          </span>
          {!isOpen && <span className="ai-fab-badge" aria-hidden>AI</span>}
          {/* Avviso di nuovo messaggio */}
          {unread && !isOpen && (
            <span className="absolute -top-1 -left-1 w-4 h-4 bg-red-500 rounded-full border-2 border-black text-[9px] font-bold text-white flex items-center justify-center">
              !
            </span>
          )}
        </span>
      </button>
    </>
  );
}
