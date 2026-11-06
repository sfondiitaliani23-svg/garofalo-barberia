'use server';

import { requireAdmin, requireAdminView } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { sendPushToUser } from '@/lib/utils/push';
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
} from '@/lib/utils/eliseo';

export type EliseoPayload = {
  ok: true;
  tester: boolean;
  contatti: Contatto[];
  modelli: Modello[];
  campagne: Campagna[];
  casella: CasellaItem[];
  team: Array<{ id: string; nome: string }>;
};

export type EliseoError = { ok: false; error: string };

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

    // 2. Contatti da eliseo_contatti
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

    return {
      ok: true,
      tester,
      contatti,
      modelli,
      campagne,
      casella,
      team,
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
