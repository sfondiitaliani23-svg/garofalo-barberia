/**
 * Assistente con intelligenza artificiale GRATUITA, con riserve a catena:
 *   1) Google Gemini (piano gratuito)  2) Groq (piano gratuito)  3) motore a regole attuale.
 * L'AI riceve solo i dati veri del salone e la risposta del motore a regole come riferimento:
 * non deve inventare. Se un servizio è al limite o non risponde, si passa al successivo.
 * Le chiavi si inseriscono in Admin (riga privata "cfg:ai") oppure come variabili d'ambiente.
 */
import { SITE_CONFIG } from '@/lib/site-config';
import { ALL_FAQ } from '@/lib/data/faq';
import { createServiceClient } from '@/lib/supabase/server';
import type { ChatHistoryItem, ChatKnowledge } from '@/lib/chat/assistant';
import type { Lang } from '@/lib/i18n';

export type AiConfig = {
  enabled: boolean;
  geminiKey?: string;
  groqKey?: string;
  geminiModel?: string;
  groqModel?: string;
};

export type AiProvider = 'gemini' | 'groq';

const DEFAULT_MODELS: Record<AiProvider, string> = {
  gemini: 'gemini-flash-latest',
  groq: 'llama-3.3-70b-versatile',
};

/** Modelli di riserva dello stesso servizio: se uno è sovraccarico (503) o non esiste più (404), si prova il successivo. */
const FALLBACK_MODELS: Record<AiProvider, string[]> = {
  gemini: ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-flash-lite-latest', 'gemini-2.5-flash-lite', 'gemini-2.0-flash'],
  groq: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'openai/gpt-oss-20b'],
};

function modelsFor(provider: AiProvider, preferred?: string) {
  const list = FALLBACK_MODELS[provider];
  return preferred && !list.includes(preferred) ? [preferred, ...list] : preferred ? [preferred, ...list.filter((m) => m !== preferred)] : list;
}

/** Prova i modelli del servizio uno dopo l'altro. Chiave sbagliata (401/403) o limite (429): si smette subito. */
async function callWithModels(provider: AiProvider, key: string, preferred: string | undefined, messages: Msg[], timeoutMs: number, maxModels = 3, maxTokens = 400) {
  let last: Error | null = null;
  for (const model of modelsFor(provider, preferred).slice(0, maxModels)) {
    try {
      return { text: await callProvider(provider, key, model, messages, timeoutMs, maxTokens), model };
    } catch (e) {
      last = e as Error;
      if (/\b(401|403|429)\b/.test(last.message)) break;
    }
  }
  throw last ?? new Error(`${provider} non disponibile`);
}

const ENDPOINTS: Record<AiProvider, string> = {
  gemini: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
  groq: 'https://api.groq.com/openai/v1/chat/completions',
};

let cache: { at: number; cfg: AiConfig } | null = null;

export async function readAiConfig(fresh = false): Promise<AiConfig> {
  if (!fresh && cache && Date.now() - cache.at < 60_000) return cache.cfg;
  let stored: Partial<AiConfig> = {};
  try {
    const supabase = await createServiceClient();
    if (supabase) {
      const { data } = await supabase.from('site_content').select('body').eq('key', 'cfg:ai').maybeSingle();
      if (data?.body) stored = JSON.parse(data.body);
    }
  } catch {
    /* configurazione non leggibile: si usano solo le variabili d'ambiente */
  }
  const cfg: AiConfig = {
    enabled: stored.enabled !== false,
    geminiKey: stored.geminiKey || process.env.GEMINI_API_KEY || undefined,
    groqKey: stored.groqKey || process.env.GROQ_API_KEY || undefined,
    geminiModel: stored.geminiModel || process.env.GEMINI_MODEL || DEFAULT_MODELS.gemini,
    groqModel: stored.groqModel || process.env.GROQ_MODEL || DEFAULT_MODELS.groq,
  };
  cache = { at: Date.now(), cfg };
  return cfg;
}

export function clearAiConfigCache() {
  cache = null;
}

const euro = (c: number) => `${(c / 100).toFixed(2).replace('.', ',')} €`;

/** Scheda con i soli dati veri del salone. */
export function buildFacts(k: ChatKnowledge): string {
  const now = k.now ?? new Date();
  const today = now.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Rome' });
  const time = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' });
  const lines = [
    `Oggi è ${today}, ore ${time} (ora italiana).`,
    `Nome: ${SITE_CONFIG.name}. Indirizzo: ${SITE_CONFIG.address}.`,
    `Telefono e WhatsApp: ${SITE_CONFIG.phoneDisplay}. Email: ${SITE_CONFIG.email}.`,
    'Orari:',
    ...SITE_CONFIG.detailedHours.map((h) => `- ${h.day}: ${h.time}`),
    'Servizi e prezzi (listino attuale):',
    ...(k.services.length
      ? k.services.map((s) => `- ${s.name}: ${euro(s.price_cents)}, circa ${s.duration_minutes} minuti`)
      : SITE_CONFIG.services.map((s) => `- ${s}`)),
    `Barbieri: ${k.barbers.map((b) => `${b.name} (${b.role})`).join(', ') || 'il team del salone'}.`,
  ];
  if (k.promotions.length) {
    lines.push('Promozioni attive:');
    for (const p of k.promotions) {
      const val = p.discount_type === 'percent' ? `-${p.discount_value}%` : `-${euro(p.discount_value)}`;
      lines.push(`- ${p.title}${p.serviceName ? ` (su ${p.serviceName})` : ''}: ${val}${p.code ? `, codice ${p.code}` : ''}${p.ends_at ? `, fino al ${new Date(p.ends_at).toLocaleDateString('it-IT', { timeZone: 'Europe/Rome' })}` : ''}${p.description ? `. ${p.description}` : ''}`);
    }
  } else lines.push('Promozioni attive: nessuna al momento.');
  lines.push('Domande frequenti:');
  for (const f of ALL_FAQ) lines.push(`- D: ${f.q} R: ${f.a}`);
  lines.push('Pagine del sito: /prenota (prenotazione online con orari liberi in tempo reale), /servizi, /contatti, /galleria, /recensioni, /faq, /offerte, /area-cliente (appuntamenti del cliente).');
  return lines.join('\n');
}

/** Istruzione di lingua aggiunta in fondo al prompt quando la pagina è /en. */
const EN_INSTRUCTION = `

LANGUAGE (overrides any earlier instruction about language): the visitor is using the English version of the website. Reply in clear, warm, simple English, in at most 4-5 short sentences. The SCHEDA and the reference answer may be in Italian: translate what you need, but keep prices, opening hours, names and phone numbers exactly as they are. Never invent anything. When you mention a website page, write its English address: /en/prenota (booking), /en/servizi (services), /en/contatti (contact), /en/galleria (gallery), /en/recensioni (reviews), /en/faq, /en/offerte (offers). The customer area stays at /area-cliente.`;

function systemPrompt(facts: string, reference: string, lang: Lang = 'it') {
  return `Sei "Eliseo", l'assistente virtuale di ${SITE_CONFIG.name}, barberia a Foggia.
Rispondi in italiano, con tono cordiale e diretto, frasi corte, al massimo 4-5 frasi. Puoi usare **grassetto** e qualche emoji, senza esagerare.

REGOLE IMPORTANTI:
- Usa SOLO le informazioni nella SCHEDA qui sotto. Non inventare prezzi, orari, servizi, nomi, promozioni o disponibilità.
- Non puoi vedere né prenotare gli orari liberi: per sapere se c'è posto invita a prenotare su /prenota (mostra gli orari liberi in tempo reale) oppure a scrivere su WhatsApp.
- Se la risposta non è nella scheda, dillo con semplicità e suggerisci WhatsApp ${SITE_CONFIG.phoneDisplay}.
- Non chiedere e non ripetere dati personali (telefono, email, salute). Non dare consigli medici.
- Parla solo del salone e dei suoi servizi; per altri argomenti riporta gentilmente la conversazione sul salone.
- Non dire di essere un modello AI di qualche azienda: sei l'assistente del salone.

RISPOSTA DI RIFERIMENTO del sistema del salone (affidabile; usala se è pertinente, riformulandola in modo naturale):
"""${reference}"""

SCHEDA DEL SALONE:
${facts}${lang === 'en' ? EN_INSTRUCTION : ''}`;
}

type Msg = { role: 'system' | 'user' | 'assistant'; content: string };

async function callProvider(provider: AiProvider, key: string, model: string, messages: Msg[], timeoutMs: number, maxTokens = 400): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(ENDPOINTS[provider], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, messages, temperature: 0.3, max_tokens: maxTokens }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`${provider} ${res.status}`);
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error(`${provider} risposta vuota`);
    return text.slice(0, maxTokens > 400 ? 6000 : 1500);
  } finally {
    clearTimeout(t);
  }
}

export type AiAnswer = { text: string; provider: AiProvider } | null;

/** Chiede all'AI gratuita; torna null se nessun servizio è disponibile (si usa il motore a regole). */
export async function askAi(message: string, history: ChatHistoryItem[], k: ChatKnowledge, reference: string, cfgIn?: AiConfig, lang: Lang = 'it'): Promise<AiAnswer> {
  const cfg = cfgIn ?? (await readAiConfig());
  if (!cfg.enabled) return null;
  const chain: { provider: AiProvider; key?: string; model: string }[] = [
    { provider: 'gemini', key: cfg.geminiKey, model: cfg.geminiModel || DEFAULT_MODELS.gemini },
    { provider: 'groq', key: cfg.groqKey, model: cfg.groqModel || DEFAULT_MODELS.groq },
  ];
  const messages: Msg[] = [
    { role: 'system', content: systemPrompt(buildFacts(k), reference, lang) },
    ...history.slice(-8).map((h) => ({ role: h.role, content: h.content })),
    { role: 'user', content: message },
  ];
  for (const step of chain) {
    if (!step.key) continue;
    try {
      const { text } = await callWithModels(step.provider, step.key, step.model, messages, 7000, 2);
      return { text, provider: step.provider };
    } catch (e) {
      console.warn('[chat-ai]', step.provider, (e as Error).message);
    }
  }
  return null;
}

/** Prova un singolo servizio (per il tasto "Prova" in admin). */
export async function testProvider(provider: AiProvider, key: string, model?: string): Promise<{ ok: boolean; text?: string; error?: string; model?: string }> {
  try {
    const r = await callWithModels(
      provider,
      key,
      model || DEFAULT_MODELS[provider],
      [
        { role: 'system', content: 'Rispondi in italiano con una sola frase breve.' },
        { role: 'user', content: 'Saluta i clienti della barberia.' },
      ],
      12000,
      5
    );
    return { ok: true, text: r.text, model: r.model };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Richiesta libera all'AI gratuita (Gemini → Groq). Torna null se nessun servizio risponde. Usata dagli assistenti delle segnalazioni. */
export async function askAiRaw(messages: { role: 'system' | 'user' | 'assistant'; content: string }[], maxTokens = 1200): Promise<{ text: string; provider: AiProvider } | { error: string }> {
  const cfg = await readAiConfig();
  if (!cfg.enabled) return { error: 'L\'IA è spenta nelle impostazioni.' };
  const errors: string[] = [];
  const chain: { provider: AiProvider; key?: string; model: string }[] = [
    { provider: 'gemini', key: cfg.geminiKey, model: cfg.geminiModel || DEFAULT_MODELS.gemini },
    { provider: 'groq', key: cfg.groqKey, model: cfg.groqModel || DEFAULT_MODELS.groq },
  ];
  for (const step of chain) {
    if (!step.key) continue;
    try {
      const { text } = await callWithModels(step.provider, step.key, step.model, messages, 20000, 2, maxTokens);
      return { text, provider: step.provider };
    } catch (e) {
      console.warn('[issue-ai]', step.provider, (e as Error).message);
      errors.push((e as Error).message);
    }
  }
  return { error: errors.length ? errors.join(' · ') : 'Nessuna chiave IA salvata.' };
}
