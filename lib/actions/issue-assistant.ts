'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { askAiRaw } from '@/lib/chat/ai';
import { adminCancelAppointment, setProductStock } from '@/lib/actions/admin';
import {
  ASSISTANTS,
  categoryOfArea,
  parseAnalysis,
  scrub,
  systemPromptFor,
  type IssueAnalysis,
  type IssueProposal,
} from '@/lib/issues/assistants';

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const NO_TABLE = 'Per usare gli assistenti serve salvare le segnalazioni nel database: manca un passaggio (file 013_segnalazioni.sql). Chiedi a Eliseo.';

const fmt = (iso: string) => new Date(iso).toLocaleString('it-IT', { timeZone: 'Europe/Rome', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const euro = (c: number) => `${(c / 100).toFixed(2).replace('.', ',')} €`;

/** Fotografia dei dati veri per l'assistente della categoria. Mai nomi, telefoni o email dei clienti. */
async function snapshot(category: string): Promise<{ text: string; ids: Set<string> }> {
  const db = await createServiceClient();
  const ids = new Set<string>();
  if (!db) return { text: '(database non raggiungibile)', ids };
  const lines: string[] = [];

  if (category === 'prenotazioni') {
    const from = new Date().toISOString();
    const to = new Date(Date.now() + 14 * 86400_000).toISOString();
    const { data } = await db
      .from('appointments')
      .select('id, starts_at, ends_at, barber_id, status, barber:barbers(name), service:services(name)')
      .eq('status', 'confirmed')
      .gte('starts_at', from)
      .lte('starts_at', to)
      .order('starts_at')
      .limit(150);
    type Row = { id: string; starts_at: string; ends_at: string; barber_id: string; barber: { name: string } | null; service: { name: string } | null };
    const rows = (data ?? []) as unknown as Row[];
    lines.push(`Appuntamenti confermati nei prossimi 14 giorni: ${rows.length}.`);
    const overlaps: string[] = [];
    for (let i = 0; i < rows.length; i++) {
      for (let j = i + 1; j < rows.length; j++) {
        const a = rows[i], b = rows[j];
        if (a.barber_id === b.barber_id && a.starts_at < b.ends_at && b.starts_at < a.ends_at) {
          overlaps.push(`${a.id} e ${b.id} (${a.barber?.name ?? '?'}, ${fmt(a.starts_at)})`);
        }
      }
    }
    lines.push(overlaps.length ? `SOVRAPPOSIZIONI trovate (stesso barbiere, orari che si toccano):\n- ${overlaps.slice(0, 15).join('\n- ')}` : 'Sovrapposizioni trovate: nessuna.');
    lines.push('Elenco (id | inizio | fine | barbiere | servizio):');
    for (const r of rows.slice(0, 80)) {
      ids.add(r.id);
      lines.push(`${r.id} | ${fmt(r.starts_at)} | ${fmt(r.ends_at)} | ${r.barber?.name ?? '?'} | ${r.service?.name ?? '?'}`);
    }
  } else if (category === 'servizi') {
    const [{ data: sv }, { data: pr }] = await Promise.all([
      db.from('services').select('id, name, price_cents, duration_minutes, is_active').order('sort_order'),
      db.from('promotions').select('id, title, code, is_active, ends_at, starts_at').order('created_at', { ascending: false }).limit(40),
    ]);
    lines.push('Servizi (id | nome | prezzo | minuti | attivo):');
    for (const s of sv ?? []) { ids.add(s.id); lines.push(`${s.id} | ${s.name} | ${euro(s.price_cents)} | ${s.duration_minutes} | ${s.is_active ? 'sì' : 'no'}`); }
    lines.push('Promozioni (id | titolo | codice | attiva | scade):');
    for (const p of pr ?? []) { ids.add(p.id); lines.push(`${p.id} | ${p.title} | ${p.code ?? '-'} | ${p.is_active ? 'sì' : 'no'} | ${p.ends_at ? fmt(p.ends_at) : 'mai'}`); }
    lines.push(`Data di oggi: ${fmt(new Date().toISOString())}.`);
  } else if (category === 'personale') {
    const [{ data: bb }, { data: to }] = await Promise.all([
      db.from('barbers').select('id, name, role, is_active').order('sort_order'),
      db.from('barber_time_off').select('id, start_at, end_at, barber:barbers(name)').gte('end_at', new Date().toISOString()).order('start_at').limit(40),
    ]);
    lines.push('Barbieri (nome | ruolo | attivo):');
    for (const b of bb ?? []) lines.push(`${b.name} | ${b.role ?? '-'} | ${b.is_active ? 'sì' : 'no'}`);
    lines.push('Assenze future (id | barbiere | da | a):');
    for (const t of (to ?? []) as unknown as { id: string; start_at: string; end_at: string; barber: { name: string } | null }[]) {
      ids.add(t.id);
      lines.push(`${t.id} | ${t.barber?.name ?? '?'} | ${fmt(t.start_at)} | ${fmt(t.end_at)}`);
    }
  } else if (category === 'clienti') {
    const [{ count: total }, { count: noPhone }] = await Promise.all([
      db.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'customer'),
      db.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'customer').or('phone.is.null,phone.eq.'),
    ]);
    lines.push(`Clienti registrati: ${total ?? 0}. Senza telefono: ${noPhone ?? 0}.`);
    lines.push('Dalla schermata Clienti l\'admin può modificare nome/telefono/email e togliere un cliente (matita e cestino).');
  } else if (category === 'dati') {
    const { data } = await db.from('products').select('id, name, stock_quantity, is_active').order('sort_order').limit(80);
    lines.push('Prodotti (id | nome | giacenza | attivo):');
    for (const p of data ?? []) { ids.add(p.id); lines.push(`${p.id} | ${p.name} | ${p.stock_quantity} | ${p.is_active ? 'sì' : 'no'}`); }
  } else {
    lines.push('Nessun dato del salone per questa categoria: ragiona solo sul testo della segnalazione.');
  }
  return { text: lines.join('\n'), ids };
}

type Row = {
  id: string; area_id: string; title: string; description: string; priority: string;
  technical_details: string | null; ai_proposal: IssueAnalysis | null; audit: unknown; developer_notes: string | null;
};

async function loadRow(id: string): Promise<Row | null> {
  const db = await createServiceClient();
  if (!db) return null;
  const { data, error } = await db.from('site_issues').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return data as Row;
}

/** Il pulsante "Chiedi all'assistente": legge la segnalazione e propone, senza toccare nulla. */
export async function analyzeIssue(reportId: string): Promise<Result<{ analysis: IssueAnalysis }>> {
  await requireAdmin();
  const row = await loadRow(reportId);
  if (!row) return { ok: false, error: NO_TABLE };

  const category = categoryOfArea(row.area_id);
  const def = ASSISTANTS[category];
  const snap = await snapshot(category);

  const user = `SEGNALAZIONE
Titolo: ${scrub(row.title)}
Urgenza: ${row.priority}
Descrizione: ${scrub(row.description)}
${row.technical_details ? `Dettagli: ${scrub(row.technical_details)}\n` : ''}
FOTOGRAFIA DEI DATI DEL SALONE
${snap.text}`;

  const ai = await askAiRaw(
    [
      { role: 'system', content: systemPromptFor(def) },
      { role: 'user', content: user },
    ],
    1400
  );
  if ('error' in ai) {
    return { ok: false, error: `L'assistente non è raggiungibile adesso (${ai.error}). Riprova tra poco: la segnalazione resta aperta.` };
  }
  const parsed = parseAnalysis(ai.text, def, snap.ids);
  if (!parsed) return { ok: false, error: 'L\'assistente ha risposto in modo confuso. Riprova.' };

  const analysis: IssueAnalysis = {
    assistant: def.name,
    provider: ai.provider === 'gemini' ? 'Gemini' : 'Groq',
    at: new Date().toISOString(),
    ...parsed,
  };
  const db = await createServiceClient();
  await db?.from('site_issues').update({ ai_proposal: analysis, updated_at: analysis.at }).eq('id', reportId);
  revalidatePath('/admin/segnalazioni');
  return { ok: true, analysis };
}

function revalidateAll() {
  for (const p of ['/admin/segnalazioni', '/admin/prenotazioni', '/admin/servizi', '/admin/promozioni', '/admin/team', '/admin/prodotti', '/prenota', '/servizi', '/offerte']) {
    try { revalidatePath(p); } catch { /* percorso inesistente: ignorato */ }
  }
}

/** Il clic "Approva ed esegui": rilegge la proposta salvata (non quella del browser), ricontrolla e la esegue. */
export async function applyProposal(reportId: string, proposalId: string): Promise<Result<{ analysis: IssueAnalysis; message: string }>> {
  const admin = await requireAdmin();
  const row = await loadRow(reportId);
  const analysis = row?.ai_proposal;
  if (!row || !analysis) return { ok: false, error: 'Proposta non trovata. Chiedi di nuovo all\'assistente.' };
  const p = analysis.proposals.find((x) => x.id === proposalId);
  if (!p) return { ok: false, error: 'Proposta non trovata.' };
  if (p.state !== 'pending') return { ok: false, error: 'Questa azione è già stata gestita.' };

  const db = await createServiceClient();
  if (!db) return { ok: false, error: 'Database non configurato.' };

  let ok = false;
  let message = '';
  try {
    switch (p.kind) {
      case 'cancel_appointment': {
        const id = String(p.params.appointmentId);
        const { data } = await db.from('appointments').select('status').eq('id', id).maybeSingle();
        if (!data || data.status !== 'confirmed') { message = 'L\'appuntamento non è più confermato o non esiste.'; break; }
        const r = await adminCancelAppointment(id);
        ok = r.ok; message = r.ok ? 'Appuntamento annullato.' : (r.error ?? 'Errore');
        break;
      }
      case 'set_service_active': {
        const { error } = await db.from('services').update({ is_active: p.params.active === true }).eq('id', String(p.params.serviceId));
        ok = !error; message = ok ? (p.params.active ? 'Servizio acceso.' : 'Servizio spento.') : 'Errore nel salvataggio.';
        break;
      }
      case 'set_promotion_active': {
        const { error } = await db.from('promotions').update({ is_active: p.params.active === true }).eq('id', String(p.params.promotionId));
        ok = !error; message = ok ? (p.params.active ? 'Promozione accesa.' : 'Promozione spenta.') : 'Errore nel salvataggio.';
        break;
      }
      case 'delete_time_off': {
        const { error } = await db.from('barber_time_off').delete().eq('id', String(p.params.timeOffId));
        ok = !error; message = ok ? 'Assenza tolta.' : 'Errore nel salvataggio.';
        break;
      }
      case 'set_product_stock': {
        const r = await setProductStock(String(p.params.productId), Number(p.params.quantity));
        ok = r.ok; message = r.ok ? 'Giacenza corretta.' : ('error' in r && r.error ? r.error : 'Errore');
        break;
      }
      case 'note_for_developer': {
        const prev = row.developer_notes ? `${row.developer_notes}\n\n` : '';
        const { error } = await db.from('site_issues').update({ developer_notes: `${prev}${String(p.params.text)}` }).eq('id', reportId);
        ok = !error; message = ok ? 'Nota salvata per lo sviluppatore.' : 'Errore nel salvataggio.';
        break;
      }
    }
  } catch (e) {
    message = (e as Error).message || 'Errore';
  }

  const updated: IssueAnalysis = {
    ...analysis,
    proposals: analysis.proposals.map((x): IssueProposal => (x.id === p.id ? { ...x, state: ok ? 'done' : 'failed', result: message } : x)),
  };
  const audit = Array.isArray(row.audit) ? row.audit : [];
  audit.push({ at: new Date().toISOString(), by: admin.email ?? 'admin', kind: p.kind, label: p.label, params: p.params, ok, message });
  await db.from('site_issues').update({ ai_proposal: updated, audit, updated_at: new Date().toISOString() }).eq('id', reportId);
  revalidateAll();
  return ok ? { ok: true, analysis: updated, message } : { ok: false, error: message };
}

export async function dismissProposal(reportId: string, proposalId: string): Promise<Result<{ analysis: IssueAnalysis }>> {
  await requireAdmin();
  const row = await loadRow(reportId);
  if (!row?.ai_proposal) return { ok: false, error: 'Proposta non trovata.' };
  const updated: IssueAnalysis = {
    ...row.ai_proposal,
    proposals: row.ai_proposal.proposals.map((x) => (x.id === proposalId && x.state === 'pending' ? { ...x, state: 'dismissed' as const } : x)),
  };
  const db = await createServiceClient();
  await db?.from('site_issues').update({ ai_proposal: updated }).eq('id', reportId);
  revalidatePath('/admin/segnalazioni');
  return { ok: true, analysis: updated };
}
