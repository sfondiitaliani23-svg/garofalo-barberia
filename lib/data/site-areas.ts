export interface AIAgentDefinition {
  id: string;
  name: string;
  role: string;
  specialization: string;
  avatar: string;
}

export interface SiteAreaInfo {
  id: string;
  name: string;
  description: string;
  agent1: AIAgentDefinition;
  agent2: AIAgentDefinition;
}

export interface AIAgentLog {
  timestamp: string;
  agentId: string;
  agentName: string;
  step: string;
  action: string;
  status: 'info' | 'working' | 'success' | 'warning' | 'fixed';
  details?: string;
}

export interface IssueReport {
  id: string;
  areaId: string;
  areaName: string;
  title: string;
  description: string;
  priority: 'bassa' | 'media' | 'alta' | 'critica';
  status: 'in_analisi' | 'risolto_ia' | 'manuale_richiesto' | 'risolto_manuale' | 'chiuso';
  technicalDetails?: string;
  reportedBy: string; // e.g. "Luigi Garofalo (Titolare)"
  createdAt: string;
  updatedAt: string;
  aiLogs: AIAgentLog[];
  aiResolutionSummary?: string;
  developerNotes?: string;
  assignedAgents: [AIAgentDefinition, AIAgentDefinition];
}

// Mappa dettagliata delle 10 Aree del Sito con i 2 Agenti IA dedicati per ciascuna
export const SITE_AREAS: SiteAreaInfo[] = [
  {
    id: 'prenotazioni',
    name: 'Prenotazioni & Calcolatore Orari',
    description: 'Sistema di prenotazione online, orari disponibili, gestione sovrapposizioni e calendario',
    agent1: {
      id: 'agent_booking_diag',
      name: 'Agente Booking Diagnostic',
      role: 'Analizzatore Slot & Sovrapposizioni',
      specialization: 'Verifica in tempo reale della matrice oraria e prevenzione doppi appuntamenti',
      avatar: '🤖⚡',
    },
    agent2: {
      id: 'agent_booking_fixer',
      name: 'Agente Booking Recovery',
      role: 'Ripristino Auto-Guarente Slot',
      specialization: 'Sblocco automatico slot pendenti, sincronizzazione turni e auto-correzione orari',
      avatar: '🛡️🔧',
    },
  },
  {
    id: 'servizi',
    name: 'Servizi, Prezzi & Combo',
    description: 'Listino prezzi, trattamenti barba/capelli, durate e pacchetti promozionali',
    agent1: {
      id: 'agent_services_audit',
      name: 'Agente Catalog Inspector',
      role: 'Audit Prezzi & Durate',
      specialization: 'Controlla la consistenza del listino, valuta le durate e previene discrepanze di cassa',
      avatar: '✂️📊',
    },
    agent2: {
      id: 'agent_services_shield',
      name: 'Agente Service Re-Engine',
      role: 'Protezione & Auto-Fix Listino',
      specialization: 'Ripristina trattamenti inavvertitamente disattivati e corregge calcoli combo',
      avatar: '🛡️✂️',
    },
  },
  {
    id: 'promozioni',
    name: 'Promozioni & Flash Offer',
    description: 'Codici sconto, offerte a tempo limitato, sconti VIP e banner promozionali',
    agent1: {
      id: 'agent_promo_expiry',
      name: 'Agente Promo Sentinel',
      role: 'Monitoraggio Scadenze & Codici',
      specialization: 'Analizza la validità cronologica delle offerte e la corretta applicazione sconti',
      avatar: '🏷️⏳',
    },
    agent2: {
      id: 'agent_promo_fixer',
      name: 'Agente Promo Auto-Healer',
      role: 'Correttore Regole Promozionali',
      specialization: 'Auto-corregge i conflitti tra coupon e ripristina la visibilità in home page',
      avatar: '⚡🎁',
    },
  },
  {
    id: 'inventario',
    name: 'Inventario Prodotti & Magazzino',
    description: 'Gestione scorte prodotti da taglio/barba, giacenze minime e scontrini',
    agent1: {
      id: 'agent_stock_analyzer',
      name: 'Agente Stock Monitor',
      role: 'Analizzatore Giacenze & Scorte',
      specialization: 'Rileva anomalie di magazzino, calcola sottoscorta e monitora le movimentazioni',
      avatar: '📦🔍',
    },
    agent2: {
      id: 'agent_stock_reconciler',
      name: 'Agente Inventory Reconciler',
      role: 'Riconciliatore di Magazzino',
      specialization: 'Auto-corregge i totali di inventario e riallinea il magazzino con le vendite',
      avatar: '🛠️📦',
    },
  },
  {
    id: 'staff',
    name: 'Staff, Barbieri & Turni',
    description: 'Gestione barbieri, orari personali, giorni di ferie, pause e turnazioni',
    agent1: {
      id: 'agent_staff_sync',
      name: 'Agente Turni & Presenze',
      role: 'Sincronizzatore Barbieri',
      specialization: 'Verifica la matrice dei giorni lavorativi, ferie e coperture per sedia',
      avatar: '💈📅',
    },
    agent2: {
      id: 'agent_staff_guard',
      name: 'Agente Staff Optimizer',
      role: 'Bilanciatore Carico di Lavoro',
      specialization: 'Previene le sovrapposizioni di pause e assicura la continuità di servizio in salone',
      avatar: '🛡️👥',
    },
  },
  {
    id: 'clienti',
    name: 'Lista Clienti & Galleria Tagli',
    description: 'Database clienti, note personali, preferenze e galleria foto prima/dopo',
    agent1: {
      id: 'agent_customer_insights',
      name: 'Agente Data Quality Clienti',
      role: 'Indicizzatore Profili & Storico',
      specialization: 'Analizza la completezza dei dati cliente, note stile e storico presenze',
      avatar: '👥💎',
    },
    agent2: {
      id: 'agent_customer_privacy',
      name: 'Agente Privacy & Gallery Guard',
      role: 'Integrità Galleria Foto',
      specialization: 'Protegge le foto clienti, verifica l\'accessibilità e ripristina collegamenti corrotti',
      avatar: '📸🔒',
    },
  },
  {
    id: 'analytics',
    name: 'Analytics & Report Grafici',
    description: 'Statistiche sul fatturato, presenze, grafici traffico live e report settimanali',
    agent1: {
      id: 'agent_metrics_calc',
      name: 'Agente Metrics Precision',
      role: 'Calcolatore KPI & Grafici',
      specialization: 'Verifica la correttezza delle proiezioni finanziarie e del traffico visitatori',
      avatar: '📈🧮',
    },
    agent2: {
      id: 'agent_analytics_rebuilder',
      name: 'Agente Analytics Rebuilder',
      role: 'Ripristinatore Cache Grafici',
      specialization: 'Rigenera i dati statistici compromessi e risincronizza le metriche live',
      avatar: '🔄📊',
    },
  },
  {
    id: 'area_cliente',
    name: 'Area Cliente & Profilo Utente',
    description: 'Pannello utente finale, gestione propri appuntamenti, scheda fedeltà e login',
    agent1: {
      id: 'agent_ux_monitor',
      name: 'Agente Client Portal Inspector',
      role: 'Monitor Esperienza Utente',
      specialization: 'Controlla la fluidità del processo di prenotazione lato cliente e le notifica SMS/WA',
      avatar: '📱✨',
    },
    agent2: {
      id: 'agent_session_protector',
      name: 'Agente Portal Session Shield',
      role: 'Guida Autoguarigione Utente',
      specialization: 'Ripristina le sessioni utente bloccate e azzera token o cache invalide',
      avatar: '🛡️👤',
    },
  },
  {
    id: 'design_ui',
    name: 'Design, UI & Responsive Layout',
    description: 'Aspetto grafico, animazioni, adattamento per smartphone/tablet e scrollbar',
    agent1: {
      id: 'agent_ui_inspector',
      name: 'Agente UI & Fluidity Guard',
      role: 'Ispettore Layout Responsive',
      specialization: 'Scansiona elementi fuori schermo, sovrapposizioni grafiche e contrasto cromatico',
      avatar: '🎨📐',
    },
    agent2: {
      id: 'agent_style_reengine',
      name: 'Agente Style Auto-Fixer',
      role: 'Ripristinatore Regole CSS',
      specialization: 'Applica correzioni CSS istantanee, riallinea i modal ed elimina glitch visivi',
      avatar: '✨💄',
    },
  },
  {
    id: 'autenticazione',
    name: 'Sistema Autenticazione & Accessi',
    description: 'Login amministratore, protezione rotte, password e sicurezza sessione',
    agent1: {
      id: 'agent_auth_sentinel',
      name: 'Agente Auth Sentinel',
      role: 'Guardiano Credenziali & Permessi',
      specialization: 'Verifica la sicurezza delle sessioni Admin e protegge le rotte sensibili',
      avatar: '🔐🛡️',
    },
    agent2: {
      id: 'agent_security_shield',
      name: 'Agente Security Recovery',
      role: 'Auto-Protezione & Safe Mode',
      specialization: 'Ripristina i cookie di sessione corrotti ed azzera tentativi insoliti di accesso',
      avatar: '🚀🔒',
    },
  },
];
