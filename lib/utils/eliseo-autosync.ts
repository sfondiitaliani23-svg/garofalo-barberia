// Contatti automatici in Eliseo (10/11/2026, video di Eliseo): chi si iscrive al sito o scrive su WhatsApp
// compare da solo nella rubrica, con il telefono. Calcoli puri: quali righe nuove servono, senza doppioni.
import { normalizeItalianPhone } from '@/lib/utils/phone';
import { isGroupChat } from '@/lib/utils/wa-conversations';

export type EsistenteContatto = { email?: string | null; telefono?: string | null; user_id?: string | null };
export type ProfiloCliente = { id: string; full_name?: string | null; email?: string | null; phone?: string | null };
export type RichiestaWa = { nome?: string | null; contatto?: string | null };
export type NuovoContatto = {
  nome: string; email: string | null; telefono: string | null; fonte: 'sito' | 'whatsapp'; fase: 'nuovo'; consenso_marketing: false; user_id: string | null;
};

const tel = (v?: string | null) => {
  const n = normalizeItalianPhone(String(v || '').replace(/@c\.us$/i, ''));
  return n && /^[0-9 +().-]+$/.test(n) && n.length <= 40 ? n : null;
};
const mail = (v?: string | null) => {
  const s = String(v || '').trim().toLowerCase();
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s) && s.length <= 200 ? s : null;
};
const nome = (v: string | null | undefined, fallback: string) => {
  const s = String(v || '').replace(/\s+/g, ' ').trim().slice(0, 120);
  return s || fallback;
};

export function contattiDaAggiungere(esistenti: EsistenteContatto[], profili: ProfiloCliente[], richieste: RichiestaWa[]): NuovoContatto[] {
  const emails = new Set(esistenti.map((c) => mail(c.email)).filter(Boolean) as string[]);
  const tels = new Set(esistenti.map((c) => tel(c.telefono)).filter(Boolean) as string[]);
  const users = new Set(esistenti.map((c) => c.user_id).filter(Boolean) as string[]);
  const out: NuovoContatto[] = [];

  for (const p of profili) {
    const e = mail(p.email);
    const t = tel(p.phone);
    if (users.has(p.id) || (e && emails.has(e)) || (t && tels.has(t))) continue;
    if (!e && !t) continue;
    out.push({ nome: nome(p.full_name, 'Cliente'), email: e, telefono: t, fonte: 'sito', fase: 'nuovo', consenso_marketing: false, user_id: p.id });
    users.add(p.id); if (e) emails.add(e); if (t) tels.add(t);
  }
  for (const r of richieste) {
    if (isGroupChat(r.contatto)) continue;
    const t = tel(r.contatto);
    if (!t || tels.has(t)) continue;
    out.push({ nome: nome(r.nome, 'Contatto WhatsApp'), email: null, telefono: t, fonte: 'whatsapp', fase: 'nuovo', consenso_marketing: false, user_id: null });
    tels.add(t);
  }
  return out;
}
