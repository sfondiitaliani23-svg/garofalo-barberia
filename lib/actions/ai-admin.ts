'use server';

import { requireAdmin } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { clearAiConfigCache, readAiConfig, testProvider, type AiProvider } from '@/lib/chat/ai';
import type { AiSettingsView } from '@/lib/utils/ai-settings';

const mask = (k?: string) => (k ? `${k.slice(0, 4)}••••${k.slice(-4)}` : null);

export async function getAiSettingsAction(): Promise<AiSettingsView> {
  await requireAdmin();
  const cfg = await readAiConfig(true);
  const supabase = await createServiceClient();
  const days: AiSettingsView['days'] = [];
  if (supabase) {
    const { data } = await supabase.from('site_content').select('key, body').like('key', 'aistat:%').order('key', { ascending: false }).limit(7);
    for (const r of data ?? []) {
      try {
        const s = JSON.parse(r.body ?? '{}') as Record<string, number>;
        days.push({ day: (r.key as string).slice(7), gemini: s.gemini ?? 0, groq: s.groq ?? 0, regole: s.regole ?? 0 });
      } catch {
        /* riga non valida */
      }
    }
  }
  return {
    enabled: cfg.enabled,
    gemini: mask(cfg.geminiKey),
    groq: mask(cfg.groqKey),
    fromEnv: { gemini: !!process.env.GEMINI_API_KEY, groq: !!process.env.GROQ_API_KEY },
    days,
  };
}

/** Salva l'interruttore e le chiavi. Una chiave vuota lascia quella attuale; "remove" la toglie. */
export async function saveAiSettingsAction(input: {
  enabled: boolean;
  geminiKey?: string;
  groqKey?: string;
  remove?: AiProvider[];
}): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato' };
  const { data: row } = await supabase.from('site_content').select('id, body').eq('key', 'cfg:ai').maybeSingle();
  let cur: Record<string, unknown> = {};
  try {
    cur = row?.body ? JSON.parse(row.body) : {};
  } catch {
    cur = {};
  }
  const clean = (k?: string) => (k ?? '').trim().replace(/\s+/g, '');
  const g = clean(input.geminiKey);
  const q = clean(input.groqKey);
  if (g && (g.length < 20 || g.length > 200)) return { ok: false, error: 'La chiave Gemini non sembra valida.' };
  if (q && (q.length < 20 || q.length > 200)) return { ok: false, error: 'La chiave Groq non sembra valida.' };
  const next = { ...cur, enabled: input.enabled };
  if (g) (next as Record<string, unknown>).geminiKey = g;
  if (q) (next as Record<string, unknown>).groqKey = q;
  for (const p of input.remove ?? []) delete (next as Record<string, unknown>)[p === 'gemini' ? 'geminiKey' : 'groqKey'];
  const payload = { key: 'cfg:ai', title: 'assistente AI', body: JSON.stringify(next), is_active: false, updated_at: new Date().toISOString() };
  const { error } = row ? await supabase.from('site_content').update(payload).eq('id', row.id) : await supabase.from('site_content').insert(payload);
  clearAiConfigCache();
  return error ? { ok: false, error: 'Salvataggio non riuscito. Riprova.' } : { ok: true };
}

/** Prova un servizio: con la chiave appena scritta, oppure con quella salvata. */
export async function testAiAction(provider: AiProvider, key?: string): Promise<{ ok: boolean; text?: string; error?: string }> {
  await requireAdmin();
  const cfg = await readAiConfig(true);
  const k = (key ?? '').trim() || (provider === 'gemini' ? cfg.geminiKey : cfg.groqKey);
  if (!k) return { ok: false, error: 'Nessuna chiave inserita.' };
  const r = await testProvider(provider, k, provider === 'gemini' ? cfg.geminiModel : cfg.groqModel);
  if (!r.ok) {
    const code = r.error ?? '';
    const human = /401|403/.test(code)
      ? 'Chiave non valida o non attiva.'
      : /429/.test(code)
        ? 'Limite gratuito raggiunto per ora: riprova più tardi (intanto la chat usa la riserva).'
        : /abort/i.test(code)
          ? 'Il servizio non ha risposto in tempo.'
          : /\b(500|502|503|504)\b/.test(code)
            ? 'Il servizio è sovraccarico in questo momento. La chiave è salvabile: la chat riproverà da sola.'
            : `Errore: ${code}`;
    return { ok: false, error: human };
  }
  return r;
}
