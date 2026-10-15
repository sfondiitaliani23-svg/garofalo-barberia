/**
 * Assistenti IA per "Segnalaci il problema": uno per categoria.
 * Leggono la segnalazione + una fotografia dei dati veri del salone (SENZA nomi, telefoni, email dei clienti),
 * spiegano il problema e PROPONGONO azioni scelte da un elenco chiuso. Niente parte da solo: serve il clic dell'admin.
 */

export type ProposalKind =
  | 'cancel_appointment'
  | 'set_service_active'
  | 'set_promotion_active'
  | 'delete_time_off'
  | 'set_product_stock'
  | 'note_for_developer';

export type IssueProposal = {
  id: string;
  kind: ProposalKind;
  label: string;
  why: string;
  params: Record<string, string | number | boolean>;
  /** none = non ancora eseguita; done/failed = esito dopo il clic dell'admin */
  state: 'pending' | 'done' | 'failed' | 'dismissed';
  result?: string;
};

export type IssueAnalysis = {
  assistant: string;
  provider: string;
  at: string;
  diagnosis: string;
  answer: string;
  proposals: IssueProposal[];
};

export type AssistantDef = {
  id: string;
  name: string;
  focus: string;
  allowed: ProposalKind[];
};

const NOTE: ProposalKind = 'note_for_developer';

export const ASSISTANTS: Record<string, AssistantDef> = {
  tecnico: {
    id: 'tecnico',
    name: 'Assistente Tecnico',
    focus: 'Errori del sito, grafica, accessi e login. Non hai accesso al codice né ai dati: spiega cause probabili, cosa controllare e prepara una nota chiara per lo sviluppatore.',
    allowed: [NOTE],
  },
  prenotazioni: {
    id: 'prenotazioni',
    name: 'Assistente Prenotazioni',
    focus: 'Orari, slot, sovrapposizioni e appuntamenti. Usa l\'elenco dei prossimi appuntamenti e le sovrapposizioni già calcolate.',
    allowed: ['cancel_appointment', NOTE],
  },
  servizi: {
    id: 'servizi',
    name: 'Assistente Servizi e Promozioni',
    focus: 'Listino, durate, prezzi, sconti e codici. Controlla incoerenze (servizi spenti, promozioni scadute o attive per errore).',
    allowed: ['set_service_active', 'set_promotion_active', NOTE],
  },
  personale: {
    id: 'personale',
    name: 'Assistente Personale',
    focus: 'Barbieri, turni, ferie e disponibilità. Controlla periodi di assenza e barbieri non attivi.',
    allowed: ['delete_time_off', NOTE],
  },
  clienti: {
    id: 'clienti',
    name: 'Assistente Clienti',
    focus: 'Lista clienti, galleria e area cliente. Vedi solo numeri riassuntivi, mai dati personali: spiega come sistemare dalla schermata Clienti e prepara una nota se serve codice.',
    allowed: [NOTE],
  },
  dati: {
    id: 'dati',
    name: 'Assistente Dati e Magazzino',
    focus: 'Inventario prodotti, giacenze e report. Controlla scorte negative o sospette.',
    allowed: ['set_product_stock', NOTE],
  },
};

/** Da area (id interno) a categoria dell'assistente. */
export function categoryOfArea(areaId: string): keyof typeof ASSISTANTS {
  switch (areaId) {
    case 'prenotazioni':
      return 'prenotazioni';
    case 'servizi':
    case 'promozioni':
      return 'servizi';
    case 'staff':
      return 'personale';
    case 'clienti':
    case 'area_cliente':
      return 'clienti';
    case 'inventario':
    case 'analytics':
      return 'dati';
    default:
      return 'tecnico';
  }
}

const KIND_HELP: Record<ProposalKind, string> = {
  cancel_appointment: 'params: {"appointmentId": "<id dall\'elenco>"} — annulla un appuntamento confermato',
  set_service_active: 'params: {"serviceId": "<id>", "active": true|false} — accende o spegne un servizio',
  set_promotion_active: 'params: {"promotionId": "<id>", "active": true|false} — accende o spegne una promozione',
  delete_time_off: 'params: {"timeOffId": "<id>"} — toglie un periodo di assenza',
  set_product_stock: 'params: {"productId": "<id>", "quantity": <intero >= 0>} — corregge la giacenza',
  note_for_developer: 'params: {"text": "<nota chiara e completa per lo sviluppatore>"} — salva la nota nella segnalazione',
};

/** Toglie telefoni ed email dal testo scritto dall'admin prima di mandarlo al servizio IA. */
export function scrub(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email]')
    .replace(/(\+?\d[\d\s().-]{7,}\d)/g, '[numero]');
}

export function systemPromptFor(def: AssistantDef): string {
  return `Sei "${def.name}", assistente del pannello admin di Barberia Garofalo (Foggia). Parli con il titolare, non con un tecnico: italiano semplice, frasi corte.
Il tuo campo: ${def.focus}

REGOLE:
- Usa SOLO i dati forniti nella FOTOGRAFIA e nella segnalazione. Non inventare id, orari, prezzi o nomi. Se non bastano per capire, dillo e chiedi cosa guardare.
- Non chiedere né ripetere dati personali dei clienti.
- Puoi PROPORRE azioni solo di questi tipi (e nessun altro):
${def.allowed.map((k) => `  • ${k} — ${KIND_HELP[k]}`).join('\n')}
- Gli id nelle azioni devono essere copiati ESATTAMENTE dalla fotografia. Proponi solo azioni davvero utili, al massimo 3. Ogni azione parte solo se il titolare la approva.
- Se il problema richiede modifiche al codice o non è risolvibile con le azioni sopra, proponi "note_for_developer" con un testo completo.

Rispondi SOLO con un oggetto JSON, senza altro testo, in questa forma:
{"diagnosi":"cosa non va, in 1-3 frasi","risposta":"cosa fare/che cosa ho trovato, in 2-4 frasi","azioni":[{"kind":"...","label":"frase breve per il bottone","why":"perché","params":{...}}]}`;
}

/** Estrae il JSON dalla risposta dell'AI e tiene solo azioni consentite. */
export function parseAnalysis(raw: string, def: AssistantDef, validIds: Set<string>): { diagnosis: string; answer: string; proposals: IssueProposal[] } | null {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  let obj: { diagnosi?: unknown; risposta?: unknown; azioni?: unknown };
  try {
    obj = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
  const diagnosis = typeof obj.diagnosi === 'string' ? obj.diagnosi.trim().slice(0, 600) : '';
  const answer = typeof obj.risposta === 'string' ? obj.risposta.trim().slice(0, 900) : '';
  if (!diagnosis && !answer) return null;
  const proposals: IssueProposal[] = [];
  const list = Array.isArray(obj.azioni) ? obj.azioni : [];
  for (const a of list.slice(0, 3)) {
    if (!a || typeof a !== 'object') continue;
    const { kind, label, why, params } = a as { kind?: string; label?: string; why?: string; params?: Record<string, unknown> };
    if (!kind || !def.allowed.includes(kind as ProposalKind) || !params || typeof params !== 'object') continue;
    const clean: Record<string, string | number | boolean> = {};
    let ok = true;
    switch (kind as ProposalKind) {
      case 'cancel_appointment': {
        const id = String(params.appointmentId ?? '');
        if (!validIds.has(id)) ok = false;
        clean.appointmentId = id;
        break;
      }
      case 'set_service_active': {
        const id = String(params.serviceId ?? '');
        if (!validIds.has(id) || typeof params.active !== 'boolean') ok = false;
        clean.serviceId = id;
        clean.active = params.active === true;
        break;
      }
      case 'set_promotion_active': {
        const id = String(params.promotionId ?? '');
        if (!validIds.has(id) || typeof params.active !== 'boolean') ok = false;
        clean.promotionId = id;
        clean.active = params.active === true;
        break;
      }
      case 'delete_time_off': {
        const id = String(params.timeOffId ?? '');
        if (!validIds.has(id)) ok = false;
        clean.timeOffId = id;
        break;
      }
      case 'set_product_stock': {
        const id = String(params.productId ?? '');
        const q = Number(params.quantity);
        if (!validIds.has(id) || !Number.isInteger(q) || q < 0 || q > 100000) ok = false;
        clean.productId = id;
        clean.quantity = q;
        break;
      }
      case 'note_for_developer': {
        const t = String(params.text ?? '').trim();
        if (t.length < 5) ok = false;
        clean.text = scrub(t).slice(0, 2000);
        break;
      }
    }
    if (!ok) continue;
    proposals.push({
      id: `P${proposals.length + 1}`,
      kind: kind as ProposalKind,
      label: String(label ?? 'Esegui').slice(0, 90),
      why: String(why ?? '').slice(0, 300),
      params: clean,
      state: 'pending',
    });
  }
  return { diagnosis, answer, proposals };
}
