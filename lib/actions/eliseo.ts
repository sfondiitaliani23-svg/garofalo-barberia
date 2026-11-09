'use server';

import { requireAdmin, requireAdminView } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { sendPushToUser } from '@/lib/utils/push';
import { clearTrainingCache } from '@/lib/chat/eliseo-training-server';
import { contattiDaAggiungere } from '@/lib/utils/eliseo-autosync';
import {
  cleanContact,
  cleanTemplate,
  cleanTags,
  type Campagna,
  type CasellaItem,
  type Categoria,
  type Contatto,
  type Fase,
  type Fonte,
  type Modello,
  type FaqItem,
  type DocumentoItem,
  type AssistenteConfig,
  type AssistenteVersione,
  type AutomazioneItem,
} from '@/lib/utils/eliseo';

export type EliseoPayload = {
  ok: true;
  tester: boolean;
  contatti: Contatto[];
  modelli: Modello[];
  campagne: Campagna[];
  casella: CasellaItem[];
  team: Array<{ id: string; nome: string }>;
  faq: FaqItem[];
  documenti: DocumentoItem[];
  assistente: AssistenteConfig;
  versioniPrompt: AssistenteVersione[];
  automazioni: AutomazioneItem[];
};

export type EliseoError = { ok: false; error: string };

type ServiceClient = NonNullable<Awaited<ReturnType<typeof createServiceClient>>>;

/** Iscritti al sito e contatti WhatsApp in rubrica da soli. Al massimo una volta ogni 5 minuti, mai bloccante. */
async function autoSyncContatti(supabase: ServiceClient) {
  const KEY = 'eliseo:autosync';
  const { data: last } = await supabase.from('site_content').select('id, updated_at').eq('key', KEY).maybeSingle();
  if (last?.updated_at && Date.now() - new Date(last.updated_at).getTime() < 5 * 60_000) return;
  const now = new Date().toISOString();
  if (last) await supabase.from('site_content').update({ updated_at: now }).eq('id', last.id);
  else await supabase.from('site_content').insert({ key: KEY, title: 'sincronizzazione contatti Eliseo', body: '', is_active: false, updated_at: now });

  const [esistenti, profili, richieste] = await Promise.all([
    supabase.from('eliseo_contatti').select('email, telefono, user_id').limit(5000),
    supabase.from('profiles').select('id, full_name, email, phone').eq('role', 'customer').limit(5000),
    supabase.from('eliseo_richieste').select('nome, contatto').order('creato_il', { ascending: false }).limit(1000),
  ]);
  const nuovi = contattiDaAggiungere(esistenti.data ?? [], profili.data ?? [], richieste.data ?? []);
  // Uno alla volta: un eventuale doppione (indice unico sull'email) non ferma gli altri.
  for (const c of nuovi.slice(0, 200)) await supabase.from('eliseo_contatti').insert(c);
}

/**
 * Caricamento globale dei dati per la console Eliseo.
 * Accessibile a admin, dipendente e tester.
 */
export async function getEliseoAction(): Promise<EliseoPayload | EliseoError> {
  const { tester } = await requireAdminView();
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato.' };

  try {
    // 1. Barbieri dal database
    const { data: barbersData } = await supabase
      .from('barbers')
      .select('id, name')
      .order('sort_order', { ascending: true });

    const team = (barbersData ?? []).map((b) => ({ id: b.id, nome: b.name }));

    // 2. Contatti da eliseo_contatti (prima: iscritti al sito e chat WhatsApp nuove entrano da soli, 10/11/2026)
    if (!tester) await autoSyncContatti(supabase).catch(() => {});
    let contatti: Contatto[] = [];
    const { data: contattiData, error: contattiErr } = await supabase
      .from('eliseo_contatti')
      .select('*')
      .order('aggiornato_il', { ascending: false })
      .limit(2000);

    if (!contattiErr && contattiData) {
      contatti = contattiData.map((c) => ({
        id: c.id,
        nome: c.nome,
        email: c.email,
        telefono: c.telefono,
        fonte: (c.fonte ?? 'altro') as Fonte,
        fase: (c.fase ?? 'nuovo') as Fase,
        barbiere: c.barbiere,
        consenso_marketing: Boolean(c.consenso_marketing),
        consenso_il: c.consenso_il,
        note: c.note,
        etichette: c.etichette ?? [],
        user_id: c.user_id,
        creato_il: c.creato_il,
        aggiornato_il: c.aggiornato_il,
      }));
    } else {
      // Se la tabella eliseo_contatti non esiste ancora o è vuota, popoliamo al volo dagli appuntamenti esistenti
      const since = new Date(Date.now() - 730 * 86_400_000).toISOString();
      const { data: apptRows } = await supabase
        .from('appointments')
        .select('customer_name, customer_phone, customer_email, starts_at, status, barber:barbers(name)')
        .gte('starts_at', since)
        .order('starts_at', { ascending: false });

      if (apptRows) {
        const seen = new Set<string>();
        for (const a of apptRows) {
          const key = (a.customer_phone || a.customer_email || a.customer_name || '').trim().toLowerCase();
          if (!key || seen.has(key)) continue;
          seen.add(key);

          const bRaw = (a as unknown as { barber?: { name?: string } | Array<{ name?: string }> | null }).barber;
          const barbName = Array.isArray(bRaw) ? bRaw[0]?.name : bRaw?.name;
          contatti.push({
            id: `legacy-${contatti.length}`,
            nome: a.customer_name || 'Cliente',
            email: a.customer_email || null,
            telefono: a.customer_phone || null,
            fonte: 'negozio',
            fase: a.status === 'confirmed' ? 'cliente' : 'da_richiamare',
            barbiere: barbName || null,
            consenso_marketing: false,
            consenso_il: null,
            note: 'Importato dagli appuntamenti',
            etichette: ['storico'],
            creato_il: a.starts_at || new Date().toISOString(),
            aggiornato_il: a.starts_at || new Date().toISOString(),
          });
        }
      }
    }

    // 3. Modelli di messaggio
    let modelli: Modello[] = [];
    const { data: modelliData } = await supabase
      .from('eliseo_modelli')
      .select('*')
      .order('categoria', { ascending: true })
      .order('nome', { ascending: true });

    if (modelliData && modelliData.length > 0) {
      modelli = modelliData.map((m) => ({
        id: m.id,
        nome: m.nome,
        categoria: m.categoria as Categoria,
        testo: m.testo,
        creato_il: m.creato_il,
        aggiornato_il: m.aggiornato_il,
      }));
    } else {
      // Modelli predefiniti di cortesia
      modelli = [
        {
          id: 'm-promemoria',
          nome: 'Promemoria appuntamento',
          categoria: 'promemoria',
          testo: 'Ciao {nome}, ti ricordiamo il tuo appuntamento da Barberia Garofalo. Ti aspettiamo volentieri 👍',
        },
        {
          id: 'm-follow',
          nome: 'Come ti trovi?',
          categoria: 'follow_up',
          testo: 'Ciao {nome}, come ti stai trovando con il taglio fatto da noi a Barberia Garofalo?',
        },
        {
          id: 'm-feedback',
          nome: 'Feedback',
          categoria: 'feedback',
          testo: 'Ciao {nome}, come ti sei trovato l’ultima volta con {barbiere}? Per noi il tuo parere è prezioso.',
        },
        {
          id: 'm-recensione',
          nome: 'Recensione',
          categoria: 'recensione',
          testo: 'Ciao {nome}, grazie per essere passato da noi! Se ti va, lasciaci una recensione: ci aiuta tanto.',
        },
        {
          id: 'm-ritorno',
          nome: 'È ora di tornare',
          categoria: 'ritorno',
          testo: 'Ciao {nome}, è passato un po’ dall’ultima visita da Barberia Garofalo. Vuoi che ti teniamo un posto con {barbiere}?',
        },
        {
          id: 'm-upsell',
          nome: 'Servizio barba',
          categoria: 'upsell',
          testo: 'Ciao {nome}, al tuo prossimo taglio possiamo aggiungere anche il rituale barba con panno caldo.',
        },
      ];
    }

    // 4. Campagne inviate
    let campagne: Campagna[] = [];
    const { data: campData } = await supabase
      .from('eliseo_campagne')
      .select('*')
      .order('creato_il', { ascending: false })
      .limit(30);

    if (campData) {
      campagne = campData.map((c) => ({
        id: c.id,
        nome: c.nome,
        titolo: c.titolo,
        testo: c.testo,
        url: c.url,
        fasi: c.fasi ?? [],
        destinatari: c.destinatari ?? 0,
        inviati: c.inviati ?? 0,
        falliti: c.falliti ?? 0,
        creato_il: c.creato_il,
      }));
    }

    // 5. Casella unica (richieste e stato)
    const { data: reqsData } = await supabase
      .from('eliseo_richieste')
      .select('*')
      .order('creato_il', { ascending: false })
      .limit(100);

    const { data: statiData } = await supabase
      .from('eliseo_casella_stato')
      .select('*');

    const statiMap = new Map((statiData ?? []).map((s) => [`${s.tipo}:${s.rif}`, s]));

    const casella: CasellaItem[] = (reqsData ?? []).map((r) => {
      const s = statiMap.get(`richiesta:${r.id}`);
      return {
        tipo: 'richiesta' as const,
        rif: r.id,
        nome: r.nome,
        quando: r.creato_il,
        nuovo: !s,
        messaggio: r.messaggio,
        contatto: r.contatto,
        motivo: r.motivo,
        stato: (s?.stato ?? 'aperta') as 'aperta' | 'in_corso' | 'chiusa',
        assegnato: s?.assegnato ?? null,
        contatto_id: s?.contatto_id ?? null,
        cartella: s?.cartella ?? null,
      };
    });

    // Se tester: mascheramento dati privati
    if (tester) {
      contatti = contatti.map((c, i) => ({
        ...c,
        id: `c-${i}`,
        nome: `Cliente #${i + 1}`,
        email: c.email ? '***@privato.it' : null,
        telefono: c.telefono ? '+39 3** *** ****' : null,
        note: null,
      }));
    }

        // 6. FAQ
    let faq: FaqItem[] = [];
    try {
      const { data: faqData } = await supabase
        .from('eliseo_faq')
        .select('*')
        .order('cartella', { ascending: true })
        .order('domanda', { ascending: true });
      if (faqData) faq = faqData;
    } catch { faq = []; }

    // 7. Documenti
    let documenti: DocumentoItem[] = [];
    try {
      const { data: docData } = await supabase
        .from('eliseo_documenti')
        .select('*')
        .order('titolo', { ascending: true });
      if (docData) documenti = docData;
    } catch { documenti = []; }

    // 8. Assistente
    let assistente: AssistenteConfig = {
      id: 1,
      istruzioni: "Sei Eliseo, l'assistente virtuale di Barberia Garofalo a Foggia. Rispondi con tono professionale, cordiale ed elegante. Aiuta i clienti a conoscere i servizi di taglio e barba, gli orari e a prenotare sul sito.",
      escalation_attiva: true,
      testo_libero: true,
      regole: [],
      orari: {
        mar: [['08:30', '13:00'], ['15:30', '20:30']],
        mer: [['08:30', '13:00'], ['15:30', '20:30']],
        gio: [['08:30', '13:00'], ['15:30', '20:30']],
        ven: [['08:30', '13:00'], ['15:30', '20:30']],
        sab: [['08:30', '14:00'], ['14:30', '20:00']],
        dom: [],
        lun: [],
      },
    };
    try {
      const { data: assData } = await supabase
        .from('eliseo_assistente')
        .select('*')
        .eq('id', 1)
        .maybeSingle();
      if (assData) {
        assistente = {
          id: 1,
          istruzioni: assData.istruzioni || assistente.istruzioni,
          escalation_attiva: assData.escalation_attiva ?? true,
          testo_libero: assData.testo_libero ?? true,
          regole: Array.isArray(assData.regole) ? assData.regole : [],
          orari: (assData.orari && typeof assData.orari === 'object') ? assData.orari : assistente.orari,
          aggiornato_il: assData.aggiornato_il,
        };
      }
    } catch {}

    // 9. Versioni del prompt
    let versioniPrompt: AssistenteVersione[] = [];
    try {
      const { data: verData } = await supabase
        .from('eliseo_assistente_versioni')
        .select('*')
        .order('creato_il', { ascending: false })
        .limit(30);
      if (verData) versioniPrompt = verData;
    } catch { versioniPrompt = []; }

    // 10. Automazioni
    let automazioni: AutomazioneItem[] = [];
    try {
      const { data: autoData } = await supabase
        .from('eliseo_automazioni')
        .select('*')
        .order('creato_il', { ascending: false });
      if (autoData) automazioni = autoData;
    } catch { automazioni = []; }

    return {
      ok: true,
      tester,
      contatti,
      modelli,
      campagne,
      casella,
      team,
      faq,
      documenti,
      assistente,
      versioniPrompt,
      automazioni,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Errore nel caricamento di Eliseo.',
    };
  }
}

/** Salva o aggiorna un contatto */
export async function saveContattoAction(raw: Partial<Contatto>): Promise<{ ok: true; contatto: Contatto } | { ok: false; error: string }> {
  await requireAdmin();
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato.' };

  const { row, ok, errors } = cleanContact(raw);
  if (!ok) return { ok: false, error: Object.values(errors).join(' ') };

  try {
    if (raw.id && !raw.id.startsWith('legacy-')) {
      const { data, error } = await supabase
        .from('eliseo_contatti')
        .update({
          ...row,
          aggiornato_il: new Date().toISOString(),
        })
        .eq('id', raw.id)
        .select()
        .single();

      if (error || !data) throw error;
      return { ok: true, contatto: data as Contatto };
    } else {
      const { data, error } = await supabase
        .from('eliseo_contatti')
        .insert([row])
        .select()
        .single();

      if (error || !data) throw error;
      return { ok: true, contatto: data as Contatto };
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Salvataggio non riuscito.';
    if (/duplicate key|unique/i.test(msg)) {
      return { ok: false, error: 'Esiste già un contatto con questa email.' };
    }
    return { ok: false, error: msg };
  }
}

/** Elimina un contatto */
export async function deleteContattoAction(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato.' };

  try {
    const { error } = await supabase.from('eliseo_contatti').delete().eq('id', id);
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Eliminazione non riuscita.' };
  }
}

/** Cambia la fase di un contatto */
export async function setFaseContattoAction(id: string, fase: Fase): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato.' };

  try {
    const { error } = await supabase
      .from('eliseo_contatti')
      .update({ fase, aggiornato_il: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Aggiornamento fase non riuscito.' };
  }
}

/** Salva le etichette di un contatto */
export async function setEtichetteAction(key: string, etichette: string[]): Promise<{ ok: boolean; etichette?: string[]; error?: string }> {
  await requireAdmin();
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato.' };

  const tags = cleanTags(etichette);
  try {
    const { error } = await supabase
      .from('eliseo_contatti')
      .update({ etichette: tags, aggiornato_il: new Date().toISOString() })
      .eq('id', key);

    if (error) throw error;
    return { ok: true, etichette: tags };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Errore salvataggio etichette.' };
  }
}

/** Salva lista di modelli */
export async function saveModelliAction(list: Modello[]): Promise<{ ok: boolean; modelli?: Modello[]; error?: string }> {
  await requireAdmin();
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato.' };

  try {
    const { data, error } = await supabase.from('eliseo_modelli').upsert(list).select();
    if (error) throw error;
    return { ok: true, modelli: data as Modello[] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Errore salvataggio modelli.' };
  }
}

export async function saveModelloAction(raw: Partial<Modello>): Promise<{ ok: true; modello: Modello } | { ok: false; error: string }> {
  await requireAdmin();
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato.' };

  const { row, ok, errors } = cleanTemplate(raw);
  if (!ok) return { ok: false, error: Object.values(errors).join(' ') };

  try {
    if (raw.id && !raw.id.startsWith('m-')) {
      const { data, error } = await supabase
        .from('eliseo_modelli')
        .update({
          ...row,
          aggiornato_il: new Date().toISOString(),
        })
        .eq('id', raw.id)
        .select()
        .single();

      if (error || !data) throw error;
      return { ok: true, modello: data as Modello };
    } else {
      const { data, error } = await supabase
        .from('eliseo_modelli')
        .insert([row])
        .select()
        .single();

      if (error || !data) throw error;
      return { ok: true, modello: data as Modello };
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Salvataggio modello non riuscito.' };
  }
}

/** Elimina un modello di messaggio */
export async function deleteModelloAction(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato.' };

  try {
    const { error } = await supabase.from('eliseo_modelli').delete().eq('id', id);
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Eliminazione modello non riuscita.' };
  }
}

/** Copia gli iscritti dal sito nei contatti */
export async function importaIscrittiAction(): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  await requireAdmin();
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato.' };

  try {
    const { data, error } = await supabase.rpc('eliseo_importa_iscritti');
    if (error) {
      // Fallback manuale se la RPC non esiste ancora
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone')
        .eq('role', 'customer');

      let inserted = 0;
      for (const p of profiles ?? []) {
        if (!p.email) continue;
        const { error: insErr } = await supabase.from('eliseo_contatti').insert([
          {
            nome: p.full_name || 'Cliente',
            email: p.email.toLowerCase().trim(),
            telefono: p.phone,
            fonte: 'sito',
            fase: 'nuovo',
            consenso_marketing: false,
            user_id: p.id,
          },
        ]);
        if (!insErr) inserted++;
      }
      return { ok: true, count: inserted };
    }
    return { ok: true, count: Number(data ?? 0) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Importazione fallita.' };
  }
}

/** Importa batch contatti da CSV */
export async function importaCsvAction(
  nuovi: Array<Omit<Contatto, 'id' | 'creato_il' | 'aggiornato_il' | 'consenso_il'>>
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  await requireAdmin();
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato.' };

  if (!nuovi.length) return { ok: true, count: 0 };

  try {
    let count = 0;
    for (let i = 0; i < nuovi.length; i += 100) {
      const slice = nuovi.slice(i, i + 100);
      const { data, error } = await supabase.from('eliseo_contatti').insert(slice).select('id');
      if (error) throw error;
      count += data?.length ?? 0;
    }
    return { ok: true, count };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Importazione CSV fallita.' };
  }
}

/** Aggiorna stato e assegnazione nella casella unica */
export async function saveCasellaStatoAction(input: {
  tipo: 'chat' | 'richiesta';
  rif: string;
  stato: 'aperta' | 'in_corso' | 'chiusa';
  assegnato: string | null;
  contatto_id: string | null;
  cartella?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato.' };

  try {
    const { error } = await supabase.from('eliseo_casella_stato').upsert(
      {
        tipo: input.tipo,
        rif: input.rif,
        stato: input.stato,
        assegnato: input.assegnato,
        contatto_id: input.contatto_id,
        cartella: input.cartella !== undefined ? input.cartella : null,
        aggiornato_il: new Date().toISOString(),
      },
      { onConflict: 'tipo,rif' }
    );
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Aggiornamento stato casella fallito.' };
  }
}

/** Invia una campagna push ai contatti con consenso e account */
export async function sendCampagnaAction(input: {
  nome: string;
  titolo: string;
  testo: string;
  url: string;
  fasi: string[];
}): Promise<{ ok: true; inviati: number; falliti: number } | { ok: false; error: string }> {
  await requireAdmin();
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato.' };

  try {
    // 1. Trova i contatti con consenso e user_id
    const { data: contatti } = await supabase
      .from('eliseo_contatti')
      .select('id, user_id, fase')
      .eq('consenso_marketing', true)
      .not('user_id', 'is', null)
      .in('fase', input.fasi);

    let inviati = 0;
    let falliti = 0;

    for (const c of contatti ?? []) {
      if (!c.user_id) continue;
      try {
        const n = await sendPushToUser(c.user_id, {
          title: input.titolo,
          body: input.testo,
          url: input.url,
        });
        if (n > 0) inviati += n;
        else falliti++;
      } catch {
        falliti++;
      }
    }

    // 2. Registra la campagna inviata
    await supabase.from('eliseo_campagne').insert([
      {
        nome: input.nome.trim().slice(0, 80),
        titolo: input.titolo.trim().slice(0, 60),
        testo: input.testo.trim().slice(0, 160),
        url: input.url,
        fasi: input.fasi,
        destinatari: (contatti ?? []).length,
        inviati,
        falliti,
      },
    ]);

    return { ok: true, inviati, falliti };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Invio campagna fallito.' };
  }
}


// ───────────────────────────────────────────────
// FAQ Actions
// ───────────────────────────────────────────────

export async function saveFaqAction(faq: Partial<FaqItem>): Promise<{ ok: true; item: FaqItem } | { ok: false; error: string }> {
  await requireAdmin();
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato.' };

  const cartella = (faq.cartella || 'Generale').trim().slice(0, 40);
  const domanda = (faq.domanda || '').trim().slice(0, 200);
  const parole = (faq.parole || '').trim().slice(0, 300);
  const risposta = (faq.risposta || '').trim().slice(0, 1000);
  const attiva = faq.attiva ?? true;

  if (domanda.length < 3 || !risposta) {
    return { ok: false, error: 'Compila domanda e risposta.' };
  }

  try {
    if (faq.id) {
      const { data, error } = await supabase
        .from('eliseo_faq')
        .update({ cartella, domanda, parole, risposta, attiva, aggiornato_il: new Date().toISOString() })
        .eq('id', faq.id)
        .select('*')
        .single();
      if (error) throw error;
      return { ok: true, item: data };
    } else {
      const { data, error } = await supabase
        .from('eliseo_faq')
        .insert([{ cartella, domanda, parole, risposta, attiva }])
        .select('*')
        .single();
      if (error) throw error;
      return { ok: true, item: data };
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Salvataggio FAQ fallito.' };
  }
}

export async function deleteFaqAction(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato.' };

  try {
    const { error } = await supabase.from('eliseo_faq').delete().eq('id', id);
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Eliminazione FAQ fallita.' };
  }
}

// ───────────────────────────────────────────────
// Documenti Actions
// ───────────────────────────────────────────────

export async function saveDocumentoAction(doc: Partial<DocumentoItem>): Promise<{ ok: true; item: DocumentoItem } | { ok: false; error: string }> {
  await requireAdmin();
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato.' };

  const titolo = (doc.titolo || 'Documento').trim().slice(0, 120);
  const testo = (doc.testo || '').trim().slice(0, 20000);
  const attivo = doc.attivo ?? true;

  if (!titolo || !testo) {
    return { ok: false, error: 'Compila titolo e testo del file.' };
  }

  try {
    if (doc.id) {
      const { data, error } = await supabase
        .from('eliseo_documenti')
        .update({ titolo, testo, attivo, aggiornato_il: new Date().toISOString() })
        .eq('id', doc.id)
        .select('*')
        .single();
      if (error) throw error;
      return { ok: true, item: data };
    } else {
      const { data, error } = await supabase
        .from('eliseo_documenti')
        .insert([{ titolo, testo, attivo }])
        .select('*')
        .single();
      if (error) throw error;
      return { ok: true, item: data };
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Salvataggio documento fallito.' };
  }
}

export async function deleteDocumentoAction(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato.' };

  try {
    const { error } = await supabase.from('eliseo_documenti').delete().eq('id', id);
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Eliminazione documento fallita.' };
  }
}

// ───────────────────────────────────────────────
// Prompt & Assistente Actions
// ───────────────────────────────────────────────

export async function savePromptAction(istruzioni: string): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato.' };

  const clean = (istruzioni || '').slice(0, 10000);
  try {
    const { error } = await supabase
      .from('eliseo_assistente')
      .upsert({ id: 1, istruzioni: clean, aggiornato_il: new Date().toISOString() });
    if (error) throw error;
    clearTrainingCache();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Salvataggio prompt fallito.' };
  }
}

export async function saveEscalationAction(conf: {
  escalation_attiva: boolean;
  testo_libero: boolean;
  regole: Array<{ titolo: string; azione: string; attiva: boolean }>;
  orari: Record<string, Array<[string, string]>>;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato.' };

  try {
    const { error } = await supabase
      .from('eliseo_assistente')
      .upsert({
        id: 1,
        escalation_attiva: conf.escalation_attiva,
        testo_libero: conf.testo_libero,
        regole: conf.regole,
        orari: conf.orari,
        aggiornato_il: new Date().toISOString(),
      });
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Salvataggio regole fallito.' };
  }
}

// ───────────────────────────────────────────────
// Automazioni Actions
// ───────────────────────────────────────────────

export async function saveAutomazioneAction(auto: Partial<AutomazioneItem>): Promise<{ ok: true; item: AutomazioneItem } | { ok: false; error: string }> {
  await requireAdmin();
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato.' };

  const nome = (auto.nome || '').trim().slice(0, 80);
  const quando = auto.quando;
  const condizione = auto.condizione?.trim() || null;
  const azione = auto.azione;
  const valore = auto.valore?.trim() || null;
  const attiva = auto.attiva ?? true;

  if (!nome || !quando || !azione) {
    return { ok: false, error: "Compila tutti i campi obbligatori dell'automazione." };
  }

  try {
    if (auto.id) {
      const { data, error } = await supabase
        .from('eliseo_automazioni')
        .update({ nome, quando, condizione, azione, valore, attiva })
        .eq('id', auto.id)
        .select('*')
        .single();
      if (error) throw error;
      return { ok: true, item: data };
    } else {
      const { data, error } = await supabase
        .from('eliseo_automazioni')
        .insert([{ nome, quando, condizione, azione, valore, attiva }])
        .select('*')
        .single();
      if (error) throw error;
      return { ok: true, item: data };
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Salvataggio automazione fallito.' };
  }
}

export async function toggleAutomazioneAction(id: string, attiva: boolean): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato.' };

  try {
    const { error } = await supabase
      .from('eliseo_automazioni')
      .update({ attiva })
      .eq('id', id);
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Modifica stato automazione fallita.' };
  }
}

export async function deleteAutomazioneAction(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato.' };

  try {
    const { error } = await supabase.from('eliseo_automazioni').delete().eq('id', id);
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Eliminazione automazione fallita.' };
  }
}

// ───────────────────────────────────────────────
// Test Chatbot Simulation Action
// ───────────────────────────────────────────────

export async function testChatbotAction(domanda: string): Promise<{ risposta: string; motivo: string }> {
  const d = (domanda || '').trim().toLowerCase();
  if (!d) return { risposta: 'Come posso aiutarti oggi?', motivo: 'Perché: saluto iniziale' };

  const supabase = await createServiceClient();
  if (!supabase) {
    return { risposta: 'Ti diamo il benvenuto in Barberia Garofalo! Puoi prenotare dal sito in ogni momento.', motivo: 'Perché: fallback offline' };
  }

  // 1. Escalation check
  if (/(parlare|persona|umano|operatore|luigi|francesco|vittorio|contatto)/i.test(d)) {
    return {
      risposta: 'Certamente! Puoi metterti in contatto con il team al numero WhatsApp 388 423 3929 o passare direttamente in salone a Foggia.',
      motivo: 'Perché: passaggio a una persona (regola escalation)',
    };
  }

  // 2. FAQ match
  try {
    const { data: faqs } = await supabase.from('eliseo_faq').select('*').eq('attiva', true);
    if (faqs && faqs.length > 0) {
      for (const f of faqs) {
        const words = (f.domanda + ' ' + (f.parole || '')).toLowerCase().split(/[,\s]+/);
        const match = words.filter((w: string) => w.length > 3 && d.includes(w));
        if (match.length >= 1) {
          return {
            risposta: f.risposta,
            motivo: `Perché: FAQ «${f.domanda}»`,
          };
        }
      }
    }
  } catch {}

  // 3. Documenti match
  try {
    const { data: docs } = await supabase.from('eliseo_documenti').select('*').eq('attivo', true);
    if (docs && docs.length > 0) {
      for (const doc of docs) {
        if (doc.testo && d.split(' ').some((w: string) => w.length > 4 && doc.testo.toLowerCase().includes(w))) {
          return {
            risposta: doc.testo.slice(0, 300) + '...',
            motivo: `Perché: documento «${doc.titolo}»`,
          };
        }
      }
    }
  } catch {}

  // 4. Default barberia knowledge
  if (/(orari|quando|aperto|chiuso|domenica|lunedi|sabato)/i.test(d)) {
    return {
      risposta: 'Siamo aperti dal Martedì al Venerdì dalle 08:30 alle 13:00 e dalle 15:30 alle 20:30. Il Sabato orario speciale 08:30–14:00 e 14:30–20:00. Domenica e Lunedì siamo chiusi.',
      motivo: 'Perché: dati del sito (orari di apertura)',
    };
  }
  if (/(prezzo|costo|servizi|taglio|barba|shampoo)/i.test(d)) {
    return {
      risposta: 'I nostri servizi includono Taglio Uomo, Modellatura Barba con panno caldo, Trattamenti cute e Barba Express. Puoi consultare il listino completo e prenotare alla pagina /prenota del nostro sito.',
      motivo: 'Perché: dati del sito (listino servizi)',
    };
  }

  return {
    risposta: 'Grazie per il tuo messaggio! Da Barberia Garofalo ci prendiamo cura del tuo stile con taglio e trattamenti barba su misura. Puoi prenotare il tuo appuntamento online direttamente dal nostro sito.',
    motivo: 'Perché: risposta generale assistente',
  };
}
