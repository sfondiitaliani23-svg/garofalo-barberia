'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Send, Scissors, RotateCcw, ChevronDown } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const WELCOME: Message = {
  id: '0',
  role: 'assistant',
  content: 'Ciao! 👋 Sono **Eliseo**, il tuo assistente virtuale della Barberia Garofalo.\n\nPosso aiutarti con:\n• Orari e prenotazioni\n• Servizi e prezzi\n• Come raggiungerci\n• Qualsiasi altra domanda!',
};

const QUICK_QUESTIONS = [
  'Quali sono gli orari?',
  'Quanto costa un taglio?',
  'Come prenoto?',
  'Dove siete?',
];

export function EliseoChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim() }),
      });
      const data = await res.json();
      
      const replies: string[] = data.replies || (data.reply ? [data.reply] : ['Mi dispiace, riprova tra poco.']);
      
      for (let i = 0; i < replies.length; i++) {
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 600));
        }
        const botMsg: Message = {
          id: `${Date.now()}-${i}`,
          role: 'assistant',
          content: replies[i],
        };
        setMessages(prev => [...prev, botMsg]);
      }
      
      if (!isOpen) setUnread(true);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Scusami, si è verificato un errore. Contattaci su WhatsApp al 320 188 6277. 📱`,
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
  };

  /** Render a single message bubble */
  const renderContent = (text: string) =>
    text.split('\n').map((line, i) => {
      // Bold: **text**
      const parts = line.split(/\*\*(.*?)\*\*/g);
      return (
        <p key={i} className={i > 0 ? 'mt-0.5' : ''}>
          {parts.map((part, j) =>
            j % 2 === 1 ? <strong key={j}>{part}</strong> : part
          )}
        </p>
      );
    });

  return (
    <>
      {/* ── Chat window ── */}
      <div
        className={`fixed bottom-[9rem] sm:bottom-[13rem] right-4 z-[301] w-[340px] max-w-[calc(100vw-2rem)] rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.7)] border border-gold/20 overflow-hidden flex flex-col bg-[#090909] transition-all duration-300 origin-bottom-right ${
          isOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-90 pointer-events-none'
        }`}
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
            <button onClick={resetChat} title="Nuova chat" className="text-white/25 hover:text-white/60 transition-colors p-1">
              <RotateCcw size={13} />
            </button>
            <button onClick={() => setIsOpen(false)} className="text-white/25 hover:text-white/60 transition-colors p-1">
              <ChevronDown size={18} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 eliseo-chat-messages">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
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

        {/* Quick questions (shown only at the start) */}
        {messages.length <= 1 && (
          <div className="px-3 pb-2 flex flex-wrap gap-1.5 shrink-0">
            {QUICK_QUESTIONS.map(q => (
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
            disabled={loading}
            className="flex-1 bg-[#1a1a1a] border border-white/10 rounded-full px-4 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#cd9a4f]/40 transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="w-9 h-9 rounded-full bg-[#cd9a4f] hover:bg-[#e5b565] disabled:bg-white/8 disabled:cursor-not-allowed text-black flex items-center justify-center transition-all shrink-0 shadow-lg"
          >
            <Send size={14} className={!input.trim() || loading ? 'opacity-30' : ''} />
          </button>
        </form>
      </div>

      {/* ── FAB toggle button ── */}
      <button
        id="eliseo-chat-btn"
        onClick={() => setIsOpen(o => !o)}
        aria-label="Apri assistente Eliseo"
        className="fixed bottom-20 sm:bottom-[9rem] right-4 z-[302] group flex flex-col items-center"
      >
        <div
          className={`relative w-14 h-14 rounded-full bg-gradient-to-br from-[#cd9a4f] to-[#8f6520] shadow-[0_4px_22px_rgba(205,154,79,0.55)] flex items-center justify-center transition-all duration-300 ${
            isOpen ? 'rotate-0 scale-95' : 'group-hover:scale-110'
          }`}
        >
          {isOpen ? (
            <X size={22} className="text-black" />
          ) : (
            <Scissors size={20} className="text-black" />
          )}
          {/* Unread dot */}
          {unread && !isOpen && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-black text-[9px] font-bold text-white flex items-center justify-center">
              !
            </span>
          )}
        </div>
        {!isOpen && (
          <span className="mt-1 text-[9px] font-bold text-white/60 uppercase tracking-widest">
            Eliseo AI
          </span>
        )}
      </button>
    </>
  );
}
