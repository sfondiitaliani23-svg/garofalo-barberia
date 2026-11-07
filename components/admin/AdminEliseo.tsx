'use client';

import React, { useState, useTransition, useMemo, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  BookOpen,
  GitFork,
  Users,
  Calendar,
  Bot,
  BarChart3,
  Settings,
  Search,
  Plus,
  Trash2,
  Copy,
  ExternalLink,
  Upload,
  Clock,
  Sparkles,
  FileText,
  X,
  RefreshCw,
  Globe,
  HelpCircle,
  Folder,
  Send,
  Mail,
} from 'lucide-react';
import {
  FASI,
  FONTI,
  CATEGORIE,
  PAGES,
  QUANDO_AUTO,
  AZIONI_AUTO,
  CONDIZIONI_AUTO,
  describeAutomazione,
  cleanContact,
  cleanTemplate,
  cleanTags,
  allTags,
  parseCsv,
  mapImport,
  fillTemplate,
  summary,
  type Contatto,
  type Modello,
  type Campagna,
  type CasellaItem,
  type FaqItem,
  type DocumentoItem,
  type AssistenteConfig,
  type AssistenteVersione,
  type AutomazioneItem,
  type Fase,
  type Fonte,
  type Categoria,
} from '@/lib/utils/eliseo';
import {
  saveContattoAction,
  deleteContattoAction,
  setFaseContattoAction,
  saveModelloAction,
  deleteModelloAction,
  importaIscrittiAction,
  importaCsvAction,
  saveCasellaStatoAction,
  sendCampagnaAction,
  saveFaqAction,
  deleteFaqAction,
  saveDocumentoAction,
  deleteDocumentoAction,
  savePromptAction,
  saveEscalationAction,
  saveAutomazioneAction,
  toggleAutomazioneAction,
  deleteAutomazioneAction,
  testChatbotAction,
} from '@/lib/actions/eliseo';
import {
  getWhatsAppStatusAction,
  getWhatsAppQrAction,
  getWhatsAppNumberAction,
  logoutWhatsAppInstanceAction,
  syncWhatsAppRecentChatsAction,
  type WhatsAppState,
} from '@/lib/actions/whatsapp-admin';
import './eliseo.css';

interface AdminEliseoProps {
  initialContatti: Contatto[];
  initialModelli: Modello[];
  initialCampagne: Campagna[];
  initialCasella: CasellaItem[];
  initialFaq?: FaqItem[];
  initialDocumenti?: DocumentoItem[];
  initialAssistente?: AssistenteConfig;
  initialVersioniPrompt?: AssistenteVersione[];
  initialAutomazioni?: AutomazioneItem[];
  team: Array<{ id: string; nome: string }>;
  tester?: boolean;
  prenotaUrl: string;
}

type RailTab =
  | 'casella'
  | 'addestramento'
  | 'automazioni'
  | 'contatti'
  | 'prenota'
  | 'prova'
  | 'analisi'
  | 'integrazioni';

type AddestramentoSubTab =
  | 'faq'
  | 'sito'
  | 'documenti'
  | 'istruzioni'
  | 'passaggio'
  | 'integrazioni';

type ContattiSubTab = 'elenco' | 'campagne' | 'modelli';

export function AdminEliseo({
  initialContatti,
  initialModelli,
  initialCampagne,
  initialCasella,
  initialFaq = [],
  initialDocumenti = [],
  initialAssistente,
  initialVersioniPrompt = [],
  initialAutomazioni = [],
  team,
  tester = false,
  prenotaUrl,
}: AdminEliseoProps) {
  const [isPending, startTransition] = useTransition();

  // Navigation State
  const [railTab, setRailTab] = useState<RailTab>('casella');
  const [addestramentoTab, setAddestramentoTab] = useState<AddestramentoSubTab>('faq');
  const [contattiTab, setContattiTab] = useState<ContattiSubTab>('elenco');
  const [contactView, setContactView] = useState<'lista' | 'kanban'>('lista');

  // Status message
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [statusBad, setStatusBad] = useState<boolean>(false);
  const say = (text?: string | null, bad = false) => {
    setStatusMsg(text || (bad ? 'Si è verificato un errore.' : ''));
    setStatusBad(bad);
    setTimeout(() => setStatusMsg(''), 6000);
  };

  // Data States
  const [contatti, setContatti] = useState<Contatto[]>(initialContatti);
  const [modelli, setModelli] = useState<Modello[]>(initialModelli);
  const [campagne, setCampagne] = useState<Campagna[]>(initialCampagne);
  const [casella, setCasella] = useState<CasellaItem[]>(initialCasella);
  const [faqList, setFaqList] = useState<FaqItem[]>(initialFaq);
  const [docList, setDocList] = useState<DocumentoItem[]>(initialDocumenti);
  const [assistente, setAssistente] = useState<AssistenteConfig>(
    initialAssistente || {
      id: 1,
      istruzioni:
        "Sei Eliseo, l'assistente virtuale di Barberia Garofalo a Foggia. Rispondi con eleganza e precisione a domande su servizi, orari e appuntamenti.",
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
    }
  );
  const [versioniPrompt, setVersioniPrompt] = useState<AssistenteVersione[]>(initialVersioniPrompt);
  const [automazioni, setAutomazioni] = useState<AutomazioneItem[]>(initialAutomazioni);
  const [faqDropdownOpen, setFaqDropdownOpen] = useState(false);
  const [waState, setWaState] = useState<WhatsAppState>('starting');
  const [waQrBase64, setWaQrBase64] = useState<string | null>(null);
  const [waQrLoading, setWaQrLoading] = useState(false);
  const [waConnectedPhone, setWaConnectedPhone] = useState<string | null>(null);
  const faqCsvInputRef = useRef<HTMLInputElement>(null);

  // ───────────────────────────────────────────────
  // Casella State
  // ───────────────────────────────────────────────
  const [casellaChi, setCasellaChi] = useState<string>('');
  const [casellaVista, setCasellaVista] = useState<'tutte' | 'aperte' | 'nuove' | 'richieste' | 'chiuse'>('tutte');
  const [casellaCartella, setCasellaCartella] = useState<string>('');
  const [casellaCartellaSearch, setCasellaCartellaSearch] = useState<string>('');
  const [cartellaSearchOpen, setCartellaSearchOpen] = useState<boolean>(false);
  const [casellaOrd, setCasellaOrd] = useState<'recenti' | 'meno_recenti'>('recenti');
  const [customCartelle, setCustomCartelle] = useState<string[]>([]);
  const [casellaQ, setCasellaQ] = useState<string>('');
  const [casellaPick, setCasellaPick] = useState<string>(initialCasella[0]?.rif || '');
  const [selectedModelloForCasella, setSelectedModelloForCasella] = useState<string>('');
  // Modal canale & WhatsApp Pairing State
  const [channelModal, setChannelModal] = useState<'pick' | 'whatsapp' | 'email' | null>(null);
  const [waConnected, setWaConnected] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try { return localStorage.getItem('eliseo_wa_connected') === '1'; } catch (_) {}
    }
    return false;
  });
  const [waPairToken, setWaPairToken] = useState<string>(() => Date.now().toString(36));
  const [newWaPhone, setNewWaPhone] = useState<string>('+39 ');
  const [newWaName, setNewWaName] = useState<string>('');
  const [newWaMsg, setNewWaMsg] = useState<string>('');
  const [newMailTo, setNewMailTo] = useState<string>('');
  const [newMailName, setNewMailName] = useState<string>('');
  const [newMailSubject, setNewMailSubject] = useState<string>('');
  const [newMailBody, setNewMailBody] = useState<string>('');


  const allCartelle = useMemo(() => {
    const fromItems = casella.map((x) => x.cartella).filter(Boolean) as string[];
    return Array.from(new Set([...fromItems, ...customCartelle])).sort();
  }, [casella, customCartelle]);

  const filteredCasella = useMemo(() => {
    const list = casella.filter((item) => {
      if (casellaChi === '__none' && item.assegnato) return false;
      if (casellaChi && casellaChi !== '__none' && item.assegnato !== casellaChi) return false;
      if (casellaVista === 'nuove' && !item.nuovo) return false;
      if (casellaVista === 'aperte' && item.stato === 'chiusa') return false;
      if (casellaVista === 'richieste' && item.tipo !== 'richiesta') return false;
      if (casellaVista === 'chiuse' && item.stato !== 'chiusa') return false;
      if (casellaCartella && (item.cartella || '') !== casellaCartella) return false;
      if (casellaQ) {
        const q = casellaQ.toLowerCase();
        const m = (item.nome || '').toLowerCase().includes(q) || (item.messaggio || '').toLowerCase().includes(q) || (item.contatto || '').toLowerCase().includes(q);
        if (!m) return false;
      }
      return true;
    });

    if (casellaOrd === 'meno_recenti') {
      list.sort((a, b) => String(a.quando).localeCompare(String(b.quando)));
    } else {
      list.sort((a, b) => String(b.quando).localeCompare(String(a.quando)));
    }
    return list;
  }, [casella, casellaChi, casellaVista, casellaCartella, casellaQ, casellaOrd]);

  const activeCasellaItem = useMemo(() => {
    return casella.find((c) => c.rif === casellaPick) || filteredCasella[0] || null;
  }, [casella, filteredCasella, casellaPick]);

  const refreshWaLive = useCallback(async () => {
    setWaQrLoading(true);
    try {
      const statusRes = await getWhatsAppStatusAction();
      if (statusRes.ok) {
        setWaState(statusRes.state);
        if (statusRes.state === 'authorized') {
          setWaQrBase64(null);
          setWaConnected(true);
          // Recupera il numero reale collegato
          getWhatsAppNumberAction().then((numRes) => {
            if (numRes.ok && numRes.phone) {
              const digits = numRes.phone.replace(/\D/g, '');
              // Formatta: 393297992673 → +39 329 799 2673
              const formatted = digits.startsWith('39') && digits.length >= 11
                ? `+39 ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`
                : `+${digits}`;
              setWaConnectedPhone(formatted);
            }
          });
          // Sincronizza messaggi recenti nella casella
          syncWhatsAppRecentChatsAction().then((syncRes) => {
            if (syncRes.ok && syncRes.inserted > 0) {
              setCasella((prev) => {
                const existingRifs = new Set(prev.map((x) => x.rif));
                const newItems = syncRes.items.filter((x) => !existingRifs.has(x.rif));
                if (newItems.length === 0) return prev;
                return [...newItems, ...prev];
              });
            }
          });
          return;
        }
      }
      const qrRes = await getWhatsAppQrAction();
      if (qrRes.ok) {
        if (qrRes.type === 'alreadyAuthorized') {
          setWaState('authorized');
          setWaQrBase64(null);
          setWaConnected(true);
        } else if (qrRes.type === 'qrCode' && qrRes.qrBase64) {
          setWaQrBase64(qrRes.qrBase64);
          setWaState('notAuthorized');
          setWaConnected(false);
          setWaConnectedPhone(null);
        }
      }
    } catch (err) {
      console.error('Errore recupero QR WhatsApp:', err);
    } finally {
      setWaQrLoading(false);
    }
  }, []);

  useEffect(() => {
    if (railTab === 'casella' && !activeCasellaItem) {
      refreshWaLive();
      // Polling ogni 5s per rilevare istantaneamente quando Luigi inquadra il QR con il telefono
      const timer = setInterval(async () => {
        try {
          const statusRes = await getWhatsAppStatusAction();
          if (statusRes.ok && statusRes.state === 'authorized') {
            setWaState('authorized');
            setWaConnected(true);
            setWaQrBase64(null);
          }
        } catch (_) {}
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [railTab, activeCasellaItem, refreshWaLive]);

  const handleUpdateCasellaStato = (
    tipo: 'chat' | 'richiesta',
    rif: string,
    patch: { stato?: 'aperta' | 'in_corso' | 'chiusa'; assegnato?: string | null; contatto_id?: string | null; cartella?: string | null }
  ) => {
    if (tester) return;
    setCasella((prev) =>
      prev.map((c) => (c.tipo === tipo && c.rif === rif ? ({ ...c, ...patch } as CasellaItem) : c))
    );
    startTransition(async () => {
      const active = casella.find((c) => c.tipo === tipo && c.rif === rif);
      const res = await saveCasellaStatoAction({
        tipo,
        rif,
        stato: patch.stato || (active?.stato as 'aperta' | 'in_corso' | 'chiusa') || 'aperta',
        assegnato: patch.assegnato !== undefined ? patch.assegnato : (active?.assegnato || null),
        contatto_id: patch.contatto_id !== undefined ? patch.contatto_id : (active?.contatto_id || null),
        cartella: patch.cartella !== undefined ? patch.cartella : (active?.cartella || null),
      });
      if (res.ok) say('Casella aggiornata.');
      else say(res.error, true);
    });
  };

  // ───────────────────────────────────────────────
  // Contatti State
  // ───────────────────────────────────────────────
  const [contactQ, setContactQ] = useState<string>('');
  const [contactFaseFilter, setContactFaseFilter] = useState<string>('');
  const [contactFolder, setContactFolder] = useState<{ kind: 'tutti' | 'fonte' | 'etichetta'; key: string }>({
    kind: 'tutti',
    key: '',
  });

  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Partial<Contatto> | null>(null);
  const [contactFormErrors, setContactFormErrors] = useState<Record<string, string>>({});

  const filteredContatti = useMemo(() => {
    return contatti.filter((c) => {
      if (contactFolder.kind === 'fonte' && c.fonte !== contactFolder.key) return false;
      if (contactFolder.kind === 'etichetta' && !(c.etichette || []).includes(contactFolder.key)) return false;
      if (contactFaseFilter && c.fase !== contactFaseFilter) return false;
      if (contactQ) {
        const q = contactQ.toLowerCase();
        const m =
          (c.nome || '').toLowerCase().includes(q) ||
          (c.email || '').toLowerCase().includes(q) ||
          (c.telefono || '').replace(/\D/g, '').includes(q.replace(/\D/g, ''));
        if (!m) return false;
      }
      return true;
    });
  }, [contatti, contactFolder, contactFaseFilter, contactQ]);

  const statsSummary = useMemo(() => summary(contatti), [contatti]);
  const availableTags = useMemo(() => allTags(contatti), [contatti]);

  const handleSetFase = (id: string, newFase: Fase) => {
    if (tester) return;
    setContatti((prev) => prev.map((c) => (c.id === id ? { ...c, fase: newFase } : c)));
    startTransition(async () => {
      const res = await setFaseContattoAction(id, newFase);
      if (res.ok) say('Fase aggiornata.');
      else say(res.error, true);
    });
  };

  const handleOpenNewContact = () => {
    setEditingContact({
      nome: '',
      email: '',
      telefono: '',
      fonte: 'negozio',
      fase: 'nuovo',
      barbiere: '',
      consenso_marketing: false,
      note: '',
      etichette: [],
    });
    setContactFormErrors({});
    setIsContactModalOpen(true);
  };

  const handleOpenEditContact = (c: Contatto) => {
    setEditingContact({ ...c });
    setContactFormErrors({});
    setIsContactModalOpen(true);
  };

  const handleSaveContact = () => {
    if (!editingContact || tester) return;
    const { row, ok, errors } = cleanContact(editingContact);
    if (!ok) {
      setContactFormErrors(errors);
      return;
    }

    startTransition(async () => {
      const res = await saveContattoAction(row);
      if (res.ok) {
        setContatti((prev) => {
          const idx = prev.findIndex((x) => x.id === res.contatto.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = res.contatto;
            return next;
          }
          return [res.contatto, ...prev];
        });
        setIsContactModalOpen(false);
        say(editingContact.id ? 'Contatto aggiornato.' : 'Contatto aggiunto.');
      } else {
        say(res.error, true);
      }
    });
  };

  const handleDeleteContact = (id: string) => {
    if (tester) return;
    if (!confirm('Vuoi eliminare definitivamente questo contatto?')) return;
    startTransition(async () => {
      const res = await deleteContattoAction(id);
      if (res.ok) {
        setContatti((prev) => prev.filter((x) => x.id !== id));
        setIsContactModalOpen(false);
        say('Contatto eliminato.');
      } else {
        say(res.error, true);
      }
    });
  };

  const handleCopyIscritti = () => {
    if (tester) return;
    startTransition(async () => {
      const res = await importaIscrittiAction();
      if (res.ok) {
        say(res.count > 0 ? `${res.count} iscritti sincronizzati in rubrica.` : 'Tutti gli iscritti sono già in rubrica.');
      } else {
        say(res.error, true);
      }
    });
  };

  // CSV Import State
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvFonte, setCsvFonte] = useState<Fonte>('whatsapp');
  const [csvTag, setCsvTag] = useState<string>('import-csv');
  const [csvPlan, setCsvPlan] = useState<{ nuovi: Partial<Contatto>[]; doppi: number; scartati: number; errore?: string } | null>(null);

  const handleCsvChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const table = parseCsv(text);
    const plan = mapImport(table, contatti, { fonte: csvFonte, etichetta: csvTag });
    setCsvPlan(plan);
  };

  const handleImportCsv = () => {
    if (!csvPlan || !csvPlan.nuovi.length || tester) return;
    startTransition(async () => {
      const validContacts = csvPlan.nuovi.map((c) => ({
        nome: c.nome || 'Senza nome',
        email: c.email || null,
        telefono: c.telefono || null,
        fonte: (c.fonte || 'whatsapp') as Fonte,
        fase: (c.fase || 'nuovo') as Fase,
        barbiere: c.barbiere || null,
        consenso_marketing: Boolean(c.consenso_marketing),
        note: c.note || null,
        etichette: c.etichette || [],
      }));
      const res = await importaCsvAction(validContacts);
      if (res.ok) {
        say(`${res.count} contatti importati con successo.`);
        setIsCsvModalOpen(false);
        setCsvPlan(null);
      } else {
        say(res.error, true);
      }
    });
  };

  // ───────────────────────────────────────────────
  // Campagne State
  // ───────────────────────────────────────────────
  const [campNome, setCampNome] = useState('');
  const [campTitolo, setCampTitolo] = useState('');
  const [campTesto, setCampTesto] = useState('');
  const [campUrl, setCampUrl] = useState('/prenota');
  const [campFasi, setCampFasi] = useState<string[]>(['cliente']);

  const campaignRecipientsCount = useMemo(() => {
    return contatti.filter((c) => c.consenso_marketing && campFasi.includes(c.fase)).length;
  }, [contatti, campFasi]);

  const handleSendCampagna = (e: React.FormEvent) => {
    e.preventDefault();
    if (tester) return;
    if (!campNome || !campTitolo || !campTesto) {
      say('Compila tutti i campi della campagna.', true);
      return;
    }
    if (!campFasi.length) {
      say('Seleziona almeno una fase target.', true);
      return;
    }

    startTransition(async () => {
      const res = await sendCampagnaAction({
        nome: campNome,
        titolo: campTitolo,
        testo: campTesto,
        url: campUrl,
        fasi: campFasi,
      });
      if (res.ok) {
        say(`Campagna inviata: ${res.inviati} avvisi partiti (${res.falliti} non recapitati).`);
        setCampagne((prev) => [
          {
            id: Date.now().toString(),
            nome: campNome,
            titolo: campTitolo,
            testo: campTesto,
            url: campUrl,
            fasi: campFasi,
            destinatari: campaignRecipientsCount,
            inviati: res.inviati,
            falliti: res.falliti,
            creato_il: new Date().toISOString(),
          },
          ...prev,
        ]);
        setCampNome('');
        setCampTitolo('');
        setCampTesto('');
      } else {
        say(res.error, true);
      }
    });
  };

  // ───────────────────────────────────────────────
  // Modelli State
  // ───────────────────────────────────────────────
  const [nuovoModelloNome, setNuovoModelloNome] = useState('');
  const [nuovoModelloCat, setNuovoModelloCat] = useState<Categoria>('benvenuto');
  const [nuovoModelloTesto, setNuovoModelloTesto] = useState('Ciao {nome}, ');

  const handleSaveNuovoModello = () => {
    if (tester) return;
    const { row, ok, errors } = cleanTemplate({
      nome: nuovoModelloNome,
      categoria: nuovoModelloCat,
      testo: nuovoModelloTesto,
    });
    if (!ok) {
      say(Object.values(errors).join(' '), true);
      return;
    }

    startTransition(async () => {
      const res = await saveModelloAction(row);
      if (res.ok) {
        setModelli((prev) => [...prev, res.modello]);
        setNuovoModelloNome('');
        setNuovoModelloTesto('Ciao {nome}, ');
        say('Modello aggiunto.');
      } else {
        say(res.error, true);
      }
    });
  };

  const handleDeleteModello = (id: string) => {
    if (tester) return;
    startTransition(async () => {
      const res = await deleteModelloAction(id);
      if (res.ok) {
        setModelli((prev) => prev.filter((m) => m.id !== id));
        say('Modello eliminato.');
      } else {
        say(res.error, true);
      }
    });
  };

  // ───────────────────────────────────────────────
  // Addestramento · FAQ State
  // ───────────────────────────────────────────────
  const [faqQ, setFaqQ] = useState('');
  const [faqSelected, setFaqSelected] = useState<Set<string>>(new Set());
  const [editingFaq, setEditingFaq] = useState<Partial<FaqItem> | null>(null);

  const filteredFaqs = useMemo(() => {
    if (!faqQ) return faqList;
    const q = faqQ.toLowerCase();
    return faqList.filter(
      (f) =>
        f.domanda.toLowerCase().includes(q) ||
        f.risposta.toLowerCase().includes(q) ||
        (f.parole || '').toLowerCase().includes(q) ||
        f.cartella.toLowerCase().includes(q)
    );
  }, [faqList, faqQ]);

  const handleSaveFaq = () => {
    if (!editingFaq || tester) return;
    startTransition(async () => {
      const res = await saveFaqAction(editingFaq);
      if (res.ok) {
        setFaqList((prev) => {
          const idx = prev.findIndex((x) => x.id === res.item.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = res.item;
            return next;
          }
          return [...prev, res.item];
        });
        setEditingFaq(null);
        say('FAQ salvata con successo.');
      } else {
        say(res.error, true);
      }
    });
  };

  const handleFaqCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || tester) return;
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (!lines.length) {
        say('Il file CSV è vuoto.');
        return;
      }
      const startIndex = lines[0].toLowerCase().includes('domanda') || lines[0].toLowerCase().includes('question') ? 1 : 0;
      let count = 0;
      for (let i = startIndex; i < lines.length; i++) {
        const parts = lines[i].split(',').map((p) => p.replace(/^"|"$/g, '').trim());
        if (parts.length >= 2 && parts[0] && parts[1]) {
          const res = await saveFaqAction({
            domanda: parts[0].slice(0, 200),
            risposta: parts[1].slice(0, 1000),
            cartella: (parts[2] || 'Generale').slice(0, 40),
            parole: (parts[3] || '').slice(0, 300),
            attiva: true,
          });
          if (res.ok) {
            setFaqList((prev) => [...prev, res.item]);
            count++;
          }
        }
      }
      if (count > 0) {
        say(`${count} FAQ importate con successo!`);
      } else {
        say('Nessuna riga valida trovata. Formato: Domanda,Risposta[,Cartella,Parole]');
      }
    } catch (err: any) {
      say(`Errore importazione CSV: ${err.message || 'file non valido'}`);
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleDeleteSelectedFaq = () => {
    if (!faqSelected.size || tester) return;
    if (!confirm(`Vuoi eliminare le ${faqSelected.size} FAQ selezionate?`)) return;
    startTransition(async () => {
      for (const id of faqSelected) {
        await deleteFaqAction(id);
      }
      setFaqList((prev) => prev.filter((f) => !faqSelected.has(f.id)));
      setFaqSelected(new Set());
      say('FAQ eliminate.');
    });
  };

  // ───────────────────────────────────────────────
  // Addestramento · Documenti / File State
  // ───────────────────────────────────────────────
  const [editingDoc, setEditingDoc] = useState<Partial<DocumentoItem> | null>(null);

  const handleSaveDocumento = () => {
    if (!editingDoc || tester) return;
    startTransition(async () => {
      const res = await saveDocumentoAction(editingDoc);
      if (res.ok) {
        setDocList((prev) => {
          const idx = prev.findIndex((x) => x.id === res.item.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = res.item;
            return next;
          }
          return [...prev, res.item];
        });
        setEditingDoc(null);
        say('Documento salvato.');
      } else {
        say(res.error, true);
      }
    });
  };

  const handleDeleteDocumento = (id: string) => {
    if (tester) return;
    if (!confirm('Vuoi eliminare questo file di conoscenza?')) return;
    startTransition(async () => {
      const res = await deleteDocumentoAction(id);
      if (res.ok) {
        setDocList((prev) => prev.filter((d) => d.id !== id));
        say('File eliminato.');
      } else {
        say(res.error, true);
      }
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length || tester) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const text = await file.text();
      startTransition(async () => {
        const res = await saveDocumentoAction({
          titolo: file.name.slice(0, 120),
          testo: text.slice(0, 20000),
          attivo: true,
        });
        if (res.ok) {
          setDocList((prev) => [...prev, res.item]);
          say('File caricato e memorizzato.');
        } else {
          say(res.error, true);
        }
      });
    }
  };

  // ───────────────────────────────────────────────
  // Addestramento · Prompt State
  // ───────────────────────────────────────────────
  const [promptText, setPromptText] = useState(assistente.istruzioni);
  const [isPromptHistoryOpen, setIsPromptHistoryOpen] = useState(false);
  const [aiImproveInput, setAiImproveInput] = useState('');

  const isPromptDirty = promptText !== assistente.istruzioni;

  const handleSavePrompt = () => {
    if (tester) return;
    startTransition(async () => {
      const res = await savePromptAction(promptText);
      if (res.ok) {
        setAssistente((prev) => ({ ...prev, istruzioni: promptText }));
        setVersioniPrompt((prev) => [
          { id: Date.now().toString(), istruzioni: assistente.istruzioni, creato_il: new Date().toISOString() },
          ...prev,
        ]);
        say('Prompt salvato. Versione precedente salvata nella cronologia.');
      } else {
        say(res.error, true);
      }
    });
  };

  const handleApplyAiImprove = (phraseToAdd?: string) => {
    const text = phraseToAdd || aiImproveInput.trim();
    if (!text) return;
    const next = `${promptText.trim()}\n${text}`.slice(0, 10000);
    setPromptText(next);
    setAiImproveInput('');
    say('Istruzione aggiunta al prompt. Rivedila e premi Salva.');
  };

  // ───────────────────────────────────────────────
  // Addestramento · Escalation State
  // ───────────────────────────────────────────────
  const handleToggleEscalation = (active: boolean) => {
    if (tester) return;
    const next = { ...assistente, escalation_attiva: active };
    setAssistente(next);
    startTransition(async () => {
      await saveEscalationAction(next);
      say(active ? 'Passaggio a una persona attivato.' : 'Passaggio a una persona disattivato.');
    });
  };

  const handleToggleTestoLibero = (active: boolean) => {
    if (tester) return;
    const next = { ...assistente, testo_libero: active };
    setAssistente(next);
    startTransition(async () => {
      await saveEscalationAction(next);
      say(active ? 'Domande libere attivate.' : 'Domande libere disattivate.');
    });
  };

  // ───────────────────────────────────────────────
  // Automazioni State
  // ───────────────────────────────────────────────
  const [autoNome, setAutoNome] = useState('');
  const [autoQuando, setAutoQuando] = useState<'nuova_richiesta' | 'nuova_chat' | 'nuovo_contatto' | 'cambio_fase'>('nuova_richiesta');
  const [autoCondizione, setAutoCondizione] = useState('');
  const [autoAzione, setAutoAzione] = useState<'assegna' | 'crea_contatto' | 'etichetta' | 'fase' | 'barbiere'>('assegna');
  const [autoValore, setAutoValore] = useState(team[0]?.nome || '');

  const handleCreateAutomazione = (e: React.FormEvent) => {
    e.preventDefault();
    if (tester) return;
    if (!autoNome.trim()) {
      say('Assegna un nome all\'automazione.', true);
      return;
    }

    startTransition(async () => {
      const res = await saveAutomazioneAction({
        nome: autoNome,
        quando: autoQuando,
        condizione: autoCondizione || null,
        azione: autoAzione,
        valore: autoValore || null,
        attiva: true,
      });
      if (res.ok) {
        setAutomazioni((prev) => [res.item, ...prev]);
        setAutoNome('');
        say('Automazione creata: lavora in background.');
      } else {
        say(res.error, true);
      }
    });
  };

  const handleToggleAutomazione = (id: string, current: boolean) => {
    if (tester) return;
    setAutomazioni((prev) => prev.map((a) => (a.id === id ? { ...a, attiva: !current } : a)));
    startTransition(async () => {
      await toggleAutomazioneAction(id, !current);
      say(!current ? 'Automazione attivata.' : 'Automazione disattivata.');
    });
  };

  const handleDeleteAutomazione = (id: string) => {
    if (tester) return;
    if (!confirm('Vuoi eliminare questa automazione?')) return;
    startTransition(async () => {
      const res = await deleteAutomazioneAction(id);
      if (res.ok) {
        setAutomazioni((prev) => prev.filter((a) => a.id !== id));
        say('Automazione eliminata.');
      } else {
        say(res.error, true);
      }
    });
  };

  // ───────────────────────────────────────────────
  // Chatbot Simulator State
  // ───────────────────────────────────────────────
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string; motivo?: string }>>([
    {
      sender: 'bot',
      text: "Ciao! Sono Eliseo, l'assistente virtuale di Barberia Garofalo. Come posso aiutarti oggi?",
      motivo: 'Saluto iniziale assistente',
    },
  ]);
  const [chatInput, setChatInput] = useState('');

  const handleSendChatMessage = async (customText?: string) => {
    const text = (customText || chatInput).trim();
    if (!text) return;
    setChatInput('');
    setChatMessages((prev) => [...prev, { sender: 'user', text }]);

    const res = await testChatbotAction(text);
    setChatMessages((prev) => [
      ...prev,
      { sender: 'bot', text: res.risposta, motivo: res.motivo },
    ]);
  };

  // Submenu items according to rail selection
  const showSubMenu = railTab === 'addestramento' || railTab === 'contatti';

  return (
    <div className={`el-app ${showSubMenu ? 'has-sub' : ''}`}>
      {/* 1. Icon Rail (Colonna laterale 64px) */}
      <nav className="el-rail" aria-label="Eliseo CRM">
        <div className="el-rail__nav">
          <span className="el-mark" aria-hidden="true">
            E
          </span>

          <button
            type="button"
            className="el-rail__btn"
            title="Conversazioni & Casella"
            aria-label="Casella"
            aria-pressed={railTab === 'casella'}
            onClick={() => setRailTab('casella')}
          >
            <MessageSquare />
          </button>

          <button
            type="button"
            className="el-rail__btn"
            title="Addestramento Assistente (FAQ, File, Prompt)"
            aria-label="Addestramento"
            aria-pressed={railTab === 'addestramento'}
            onClick={() => setRailTab('addestramento')}
          >
            <BookOpen />
          </button>

          <button
            type="button"
            className="el-rail__btn"
            title="Automazioni (Regole DB)"
            aria-label="Automazioni"
            aria-pressed={railTab === 'automazioni'}
            onClick={() => setRailTab('automazioni')}
          >
            <GitFork />
          </button>

          <button
            type="button"
            className="el-rail__btn"
            title="Contatti, Campagne e Modelli"
            aria-label="Contatti"
            aria-pressed={railTab === 'contatti'}
            onClick={() => setRailTab('contatti')}
          >
            <Users />
          </button>

          <button
            type="button"
            className="el-rail__btn"
            title="Prenotazioni"
            aria-label="Prenotazioni"
            aria-pressed={railTab === 'prenota'}
            onClick={() => setRailTab('prenota')}
          >
            <Calendar />
          </button>

          <button
            type="button"
            className="el-rail__btn"
            title="Chatbot (Simulatore di Prova)"
            aria-label="Chatbot"
            aria-pressed={railTab === 'prova'}
            onClick={() => setRailTab('prova')}
          >
            <Bot />
          </button>

          <button
            type="button"
            className="el-rail__btn"
            title="Analisi e Metriche"
            aria-label="Analisi"
            aria-pressed={railTab === 'analisi'}
            onClick={() => setRailTab('analisi')}
          >
            <BarChart3 />
          </button>
        </div>

        {/* Bottom Gear Setting Icon */}
        <button
          type="button"
          className="el-rail__btn"
          title="Impostazioni & Canali"
          aria-label="Impostazioni"
          aria-pressed={railTab === 'integrazioni'}
          onClick={() => setRailTab('integrazioni')}
        >
          <Settings />
        </button>
      </nav>

      {/* 2. Sub-side Menu (quando selezionato Addestramento o Contatti) */}
      {showSubMenu && (
        <aside className="el-side">
          {railTab === 'addestramento' && (
            <>
              <p className="el-group">Base di conoscenza</p>
              <div className="el-navs">
                <button
                  type="button"
                  className="el-nav"
                  aria-selected={addestramentoTab === 'faq'}
                  onClick={() => setAddestramentoTab('faq')}
                >
                  <HelpCircle size={15} />
                  <span>FAQ</span>
                </button>
                <button
                  type="button"
                  className="el-nav"
                  aria-selected={addestramentoTab === 'sito'}
                  onClick={() => setAddestramentoTab('sito')}
                >
                  <Globe size={15} />
                  <span>Sito web</span>
                </button>
                <button
                  type="button"
                  className="el-nav"
                  aria-selected={addestramentoTab === 'documenti'}
                  onClick={() => setAddestramentoTab('documenti')}
                >
                  <FileText size={15} />
                  <span>File</span>
                </button>
              </div>

              <p className="el-group">Agente Chat</p>
              <div className="el-navs">
                <button
                  type="button"
                  className="el-nav"
                  aria-selected={addestramentoTab === 'istruzioni'}
                  onClick={() => setAddestramentoTab('istruzioni')}
                >
                  <Sparkles size={15} />
                  <span>Prompt</span>
                </button>
                <button
                  type="button"
                  className="el-nav"
                  aria-selected={addestramentoTab === 'passaggio'}
                  onClick={() => setAddestramentoTab('passaggio')}
                >
                  <GitFork size={15} />
                  <span>Escalation</span>
                </button>
              </div>

              <div className="el-navs mt-4 pt-2 border-t border-[rgba(205,154,79,0.12)]">
                <button
                  type="button"
                  className="el-nav"
                  aria-selected={addestramentoTab === 'integrazioni'}
                  onClick={() => setAddestramentoTab('integrazioni')}
                >
                  <Settings size={15} />
                  <span>Integrazioni</span>
                </button>
              </div>
            </>
          )}

          {railTab === 'contatti' && (
            <>
              <p className="el-side__title">Rubrica & CRM</p>
              <div className="el-navs">
                <button
                  type="button"
                  className="el-nav"
                  aria-selected={contattiTab === 'elenco'}
                  onClick={() => setContattiTab('elenco')}
                >
                  <Users size={15} />
                  <span>Contatti</span>
                </button>
                <button
                  type="button"
                  className="el-nav"
                  aria-selected={contattiTab === 'campagne'}
                  onClick={() => setContattiTab('campagne')}
                >
                  <Send size={15} />
                  <span>Campagne</span>
                </button>
                <button
                  type="button"
                  className="el-nav"
                  aria-selected={contattiTab === 'modelli'}
                  onClick={() => setContattiTab('modelli')}
                >
                  <Copy size={15} />
                  <span>Modelli</span>
                </button>
              </div>

              {contattiTab === 'elenco' && (
                <>
                  <p className="el-group">Cartelle</p>
                  <div className="el-folders">
                    <button
                      type="button"
                      className="el-folder"
                      aria-pressed={contactFolder.kind === 'tutti'}
                      onClick={() => setContactFolder({ kind: 'tutti', key: '' })}
                    >
                      <span>Tutti</span>
                      <b>{contatti.length}</b>
                    </button>
                    {FONTI.map(([k, t]) => {
                      const n = contatti.filter((c) => c.fonte === k).length;
                      return (
                        <button
                          key={k}
                          type="button"
                          className="el-folder"
                          aria-pressed={contactFolder.kind === 'fonte' && contactFolder.key === k}
                          onClick={() => setContactFolder({ kind: 'fonte', key: k })}
                        >
                          <span>{t}</span>
                          <b>{n}</b>
                        </button>
                      );
                    })}
                    {availableTags.length > 0 && (
                      <>
                        <p className="el-group mt-3">Etichette</p>
                        {availableTags.map((tag) => {
                          const n = contatti.filter((c) => (c.etichette || []).includes(tag)).length;
                          return (
                            <button
                              key={tag}
                              type="button"
                              className="el-folder"
                              aria-pressed={contactFolder.kind === 'etichetta' && contactFolder.key === tag}
                              onClick={() => setContactFolder({ kind: 'etichetta', key: tag })}
                            >
                              <span>{tag}</span>
                              <b>{n}</b>
                            </button>
                          );
                        })}
                      </>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </aside>
      )}

      {/* 3. Main Stage */}
      <div className="el-stage">
        <div className="el-body">
          {/* TAB: CASELLA (STILE CONSOLE KEPLERO COMPLETA) */}
          {railTab === 'casella' && (
            <div className="el-conv">
              <aside className="el-conv__side">
                {/* Header laterale con + per nuovo contatto/messaggio */}
                <div className="el-conv__sidehead">
                  <strong>Conversazioni</strong>
                  <button
                    type="button"
                    className="el-side-iconbtn"
                    title="Nuovo contatto o messaggio"
                    aria-label="Nuovo contatto o messaggio"
                    onClick={() => setChannelModal('pick')}
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="14" y2="12" />
                    </svg>
                  </button>
                </div>

                {/* Sezione TEAM con avatar colorati */}
                <p className="el-group el-group--collapsible">
                  <span>Team</span>
                  <span className="el-group__chev">▾</span>
                </p>
                <div className="el-folders" role="group" aria-label="Team">
                  <button
                    type="button"
                    className="el-folder el-folder--av"
                    aria-pressed={casellaChi === ''}
                    onClick={() => setCasellaChi('')}
                  >
                    <span className="el-side-av el-side-av--muted" />
                    <span className="el-folder__txt">Tutti</span>
                    <b>{casella.length}</b>
                  </button>
                  <button
                    type="button"
                    className="el-folder el-folder--av"
                    aria-pressed={casellaChi === '__none'}
                    onClick={() => setCasellaChi('__none')}
                  >
                    <span className="el-side-av el-side-av--muted" />
                    <span className="el-folder__txt">Non assegnato</span>
                    <b>{casella.filter((x) => !x.assegnato).length}</b>
                  </button>
                  {team.map((p, idx) => (
                    <button
                      key={p.id}
                      type="button"
                      className="el-folder el-folder--av"
                      aria-pressed={casellaChi === p.nome}
                      onClick={() => setCasellaChi(p.nome)}
                    >
                      <span className="el-side-av" data-tone={String(idx % 5)}>
                        {(p.nome || '?').charAt(0).toUpperCase()}
                      </span>
                      <span className="el-folder__txt">{p.nome}</span>
                      <b>{casella.filter((x) => x.assegnato === p.nome).length}</b>
                    </button>
                  ))}
                </div>

                {/* Sezione STATI con icone colorate autentiche */}
                <p className="el-group el-group--collapsible">
                  <span>Stati</span>
                  <span className="el-group__chev">▾</span>
                </p>
                <div className="el-folders" role="group" aria-label="Stati">
                  <button
                    type="button"
                    className="el-folder el-folder--st"
                    aria-pressed={casellaVista === 'aperte'}
                    onClick={() => setCasellaVista('aperte')}
                  >
                    <span className="el-status-ic st-aperti">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M8.5 12.5l2.5 2.5 5-5" />
                      </svg>
                    </span>
                    <span className="el-folder__txt">Aperti</span>
                    <b>{casella.filter((x) => x.stato !== 'chiusa').length}</b>
                  </button>
                  <button
                    type="button"
                    className="el-folder el-folder--st"
                    aria-pressed={casellaVista === 'nuove'}
                    onClick={() => setCasellaVista('nuove')}
                  >
                    <span className="el-status-ic st-nuove">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="9" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                    </span>
                    <span className="el-folder__txt">Da Leggere</span>
                    <b>{casella.filter((x) => x.nuovo).length}</b>
                  </button>
                  <button
                    type="button"
                    className="el-folder el-folder--st"
                    aria-pressed={casellaVista === 'richieste'}
                    onClick={() => setCasellaVista('richieste')}
                  >
                    <span className="el-status-ic st-richieste">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                        <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                      </svg>
                    </span>
                    <span className="el-folder__txt">Richieste di supporto</span>
                    <b>{casella.filter((x) => x.tipo === 'richiesta').length}</b>
                  </button>
                  <button
                    type="button"
                    className="el-folder el-folder--st"
                    aria-pressed={casellaVista === 'chiuse'}
                    onClick={() => setCasellaVista('chiuse')}
                  >
                    <span className="el-status-ic st-chiuse">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M8.5 12.5l2.5 2.5 5-5" />
                      </svg>
                    </span>
                    <span className="el-folder__txt">Chiuso</span>
                    <b>{casella.filter((x) => x.stato === 'chiusa').length}</b>
                  </button>
                </div>

                {/* Sezione CARTELLE con ricerca e aggiunta */}
                <div className="el-group el-group--tools">
                  <span>Cartelle</span>
                  <div className="el-group__acts">
                    <button
                      type="button"
                      className="el-side-iconbtn"
                      title="Cerca cartella"
                      aria-label="Cerca cartella"
                      onClick={() => setCartellaSearchOpen((prev) => !prev)}
                    >
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="7" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="el-side-iconbtn"
                      title="Nuova cartella"
                      aria-label="Nuova cartella"
                      onClick={() => {
                        const nome = prompt('Nome della nuova cartella:');
                        if (!nome?.trim()) return;
                        const val = nome.trim().slice(0, 60);
                        if (!customCartelle.includes(val)) {
                          setCustomCartelle((prev) => [...prev, val].sort());
                        }
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {cartellaSearchOpen && (
                  <input
                    type="search"
                    className="el-search el-cartella-search"
                    placeholder="Cerca cartella…"
                    value={casellaCartellaSearch}
                    onChange={(e) => setCasellaCartellaSearch(e.target.value)}
                    autoFocus
                  />
                )}

                <div className="el-folders" role="group" aria-label="Cartelle">
                  <button
                    type="button"
                    className="el-folder el-folder--cart"
                    aria-pressed={casellaCartella === ''}
                    onClick={() => setCasellaCartella('')}
                  >
                    <span className="el-status-ic st-folder">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2z" />
                      </svg>
                    </span>
                    <span className="el-folder__txt">Tutte le cartelle</span>
                    <b>{casella.length}</b>
                  </button>

                  {allCartelle
                    .filter((c) => !casellaCartellaSearch || c.toLowerCase().includes(casellaCartellaSearch.toLowerCase()))
                    .map((c) => (
                      <button
                        key={c}
                        type="button"
                        className="el-folder el-folder--cart"
                        aria-pressed={casellaCartella === c}
                        onClick={() => setCasellaCartella(c)}
                      >
                        <span className="el-status-ic st-folder">
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2z" />
                          </svg>
                        </span>
                        <span className="el-folder__txt">{c}</span>
                        <b>{casella.filter((x) => (x.cartella || '') === c).length}</b>
                      </button>
                    ))}
                </div>
              </aside>

              <div className="el-conv__list">
                <div className="el-conv__top">
                  <div className="el-conv__titlebox">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 6.5h14a1 1 0 0 1 1 1V15a1 1 0 0 1-1 1H9l-4 3v-3H5a1 1 0 0 1-1-1V7.5a1 1 0 0 1 1-1z" />
                    </svg>
                    <strong>Conversazioni</strong>
                  </div>
                  <div className="el-conv__topacts">
                    <span className="el-count">{filteredCasella.length}</span>
                    {(waConnected || waState === 'authorized') && (
                      <button
                        type="button"
                        title="Sincronizza messaggi WhatsApp recenti"
                        className="btn btn--secondary btn--sm"
                        style={{ padding: '2px 7px', fontSize: '11px', marginLeft: '6px' }}
                        onClick={async () => {
                          say('Sincronizzazione messaggi WhatsApp...');
                          const syncRes = await syncWhatsAppRecentChatsAction();
                          if (syncRes.ok) {
                            if (syncRes.inserted > 0) {
                              setCasella((prev) => {
                                const existingRifs = new Set(prev.map((x) => x.rif));
                                const newItems = syncRes.items.filter((x) => !existingRifs.has(x.rif));
                                return newItems.length > 0 ? [...newItems, ...prev] : prev;
                              });
                              say(`✅ ${syncRes.inserted} nuovi messaggi WhatsApp importati.`);
                            } else {
                              say('Nessun nuovo messaggio WhatsApp da importare.');
                            }
                          } else {
                            say(syncRes.error || 'Errore sincronizzazione WhatsApp.', true);
                          }
                        }}
                      >
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '3px', display: 'inline' }}>
                          <path d="M17.6 6.4A8 8 0 0 0 4.2 16.9L3 21l4.2-1.1a8 8 0 0 0 10.4-13.5z" />
                        </svg>
                        Sync WA
                      </button>
                    )}
                  </div>
                </div>

                <div className="el-conv__sortbar">
                  <select
                    className="el-conv__sort"
                    value={casellaOrd}
                    onChange={(e) => setCasellaOrd(e.target.value as 'recenti' | 'meno_recenti')}
                    aria-label="Ordinamento"
                  >
                    <option value="recenti">Dai più recenti ▾</option>
                    <option value="meno_recenti">Dai meno recenti ▾</option>
                  </select>
                </div>

                <div className="el-conv__search">
                  <input
                    type="search"
                    className="el-search"
                    placeholder="Cerca nome o testo"
                    value={casellaQ}
                    onChange={(e) => setCasellaQ(e.target.value)}
                  />
                </div>

                <div className="el-conv__rows">
                  {filteredCasella.length === 0 ? (
                    <p className="pempty">Nessuna conversazione con questi filtri.</p>
                  ) : (
                    filteredCasella.map((item) => {
                      const isWa = item.tipo === 'richiesta' && !item.contatto?.includes('@');
                      return (
                        <button
                          key={`${item.tipo}:${item.rif}`}
                          type="button"
                          className={`el-row ${item.rif === activeCasellaItem?.rif ? 'is-on' : ''}`}
                          onClick={() => setCasellaPick(item.rif)}
                        >
                          <span className="el-av" data-tone={item.tipo === 'chat' ? '1' : '3'}>
                            {(item.nome || '?').charAt(0).toUpperCase()}
                          </span>
                          <span className="el-row__body">
                            <span className="el-row__top">
                              <strong>{item.nome || 'Senza nome'}</strong>
                              <span className="el-row__meta">
                                {item.nuovo && <span className="el-row__dot" title="Non letto" />}
                                {item.tipo === 'richiesta' && (
                                  <span className="el-row__headset-ic" title="Richiesta di supporto">
                                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                                      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                                    </svg>
                                  </span>
                                )}
                                <small>{item.quando ? new Date(item.quando).toLocaleDateString('it-IT') : ''}</small>
                              </span>
                            </span>
                            <span className="el-row__prev">
                              {isWa ? (
                                <span className="el-row__chan el-row__chan--wa" title="WhatsApp">
                                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M17.6 6.4A8 8 0 0 0 4.2 16.9L3 21l4.2-1.1a8 8 0 0 0 10.4-13.5z" />
                                    <path d="M15.5 14.2c-.3-.1-1.6-.8-1.8-.9-.3-.1-.5-.1-.7.2-.2.3-.8.9-1 1.1-.2.2-.4.2-.7.1-.3-.2-1.3-.5-2.5-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.7.1-.2.3-.4.5-.6.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.1-.7-1.7-1-2.3-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4s-1.2 1.2-1.2 2.8 1.2 3.2 1.4 3.4c.2.3 2.4 3.7 5.8 5.1.8.4 1.5.6 2 .7.8.3 1.6.2 2.2.1.7-.1 2.1-.9 2.4-1.7.3-.8.3-1.6.2-1.7-.1-.2-.3-.3-.6-.5z" />
                                  </svg>
                                </span>
                              ) : (
                                <span className="el-row__chan el-row__chan--chat" title="Chat">
                                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M5 6.5h14a1 1 0 0 1 1 1V15a1 1 0 0 1-1 1H9l-4 3v-3H5a1 1 0 0 1-1-1V7.5a1 1 0 0 1 1-1z" />
                                  </svg>
                                </span>
                              )}
                              <span className="el-row__snippet">
                                {item.messaggio || (item.tipo === 'chat' ? 'Chat del sito' : 'Modulo di richiesta')}
                              </span>
                            </span>
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="el-conv__detail">
                {activeCasellaItem ? (
                  <>
                    <header className="el-detail__head">
                      <span className="el-av" data-tone="4">
                        {(activeCasellaItem.nome || '?').charAt(0).toUpperCase()}
                      </span>
                      <div>
                        <h2>{activeCasellaItem.nome || 'Cliente'}</h2>
                        <p>
                          {activeCasellaItem.tipo === 'chat' ? 'Chat del sito' : 'Modulo contatti'} ·{' '}
                          {new Date(activeCasellaItem.quando).toLocaleString('it-IT')}
                        </p>
                      </div>
                    </header>

                    {activeCasellaItem.nuovo && <span className="el-dot">Nuova</span>}

                    <div className="el-detail__text">
                      {activeCasellaItem.messaggio ||
                        'Conversazione registrata sul portale del cliente.'}
                    </div>

                    <div className="el-detail__ctrl">
                      <label className="field">
                        <span>Stato</span>
                        <select
                          value={activeCasellaItem.stato || 'aperta'}
                          onChange={(e) =>
                            handleUpdateCasellaStato(activeCasellaItem.tipo, activeCasellaItem.rif, {
                              stato: e.target.value as 'aperta' | 'in_corso' | 'chiusa',
                            })
                          }
                        >
                          <option value="aperta">Aperta</option>
                          <option value="in_corso">In corso</option>
                          <option value="chiusa">Chiusa</option>
                        </select>
                      </label>

                      <label className="field">
                        <span>Assegnata a</span>
                        <select
                          value={activeCasellaItem.assegnato || ''}
                          onChange={(e) =>
                            handleUpdateCasellaStato(activeCasellaItem.tipo, activeCasellaItem.rif, {
                              assegnato: e.target.value || null,
                            })
                          }
                        >
                          <option value="">Non assegnata</option>
                          {team.map((p) => (
                            <option key={p.id} value={p.nome}>
                              {p.nome}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="el-detail__ctrl el-detail__ctrl--full">
                      <label className="field">
                        <span>Cartella</span>
                        <select
                          value={activeCasellaItem.cartella || ''}
                          onChange={(e) => {
                            const val = e.target.value || null;
                            if (val && !customCartelle.includes(val)) {
                              setCustomCartelle((prev) => [...prev, val].sort());
                            }
                            handleUpdateCasellaStato(activeCasellaItem.tipo, activeCasellaItem.rif, {
                              cartella: val,
                            });
                          }}
                        >
                          <option value="">— Nessuna cartella —</option>
                          {allCartelle.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="el-detail__act">
                      {activeCasellaItem.contatto ? (
                        <>
                          <select
                            className="el-fase"
                            value={selectedModelloForCasella}
                            onChange={(e) => setSelectedModelloForCasella(e.target.value)}
                          >
                            <option value="">Senza modello</option>
                            {modelli.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.nome}
                              </option>
                            ))}
                          </select>
                          <a
                            className="btn btn--secondary"
                            href={(() => {
                              const m = modelli.find((y) => y.id === selectedModelloForCasella);
                              const t = m ? encodeURIComponent(m.testo.replace('{nome}', activeCasellaItem.nome)) : '';
                              const c = activeCasellaItem.contatto || '';
                              if (c.includes('@')) {
                                return `mailto:${c}${t ? `?body=${t}` : ''}`;
                              }
                              const digits = c.replace(/\D/g, '');
                              const num = digits.startsWith('39') ? digits : `39${digits}`;
                              return `https://wa.me/${num}${t ? `?text=${t}` : ''}`;
                            })()}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {activeCasellaItem.contatto.includes('@') ? 'Rispondi per email' : 'Rispondi su WhatsApp'}
                          </a>
                        </>
                      ) : null}

                      {!activeCasellaItem.contatto_id && (
                        <button
                          type="button"
                          className="btn btn--secondary"
                          onClick={() => {
                            setEditingContact({
                              nome: activeCasellaItem.nome || '',
                              email: activeCasellaItem.contatto?.includes('@') ? activeCasellaItem.contatto : '',
                              telefono: !activeCasellaItem.contatto?.includes('@') ? activeCasellaItem.contatto || '' : '',
                              fonte: 'sito',
                              fase: 'nuovo',
                              barbiere: activeCasellaItem.assegnato || '',
                              consenso_marketing: false,
                              note: `Richiesta da casella: ${activeCasellaItem.messaggio || ''}`,
                            });
                            setContactFormErrors({});
                            setIsContactModalOpen(true);
                          }}
                        >
                          Aggiungi ai contatti
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="el-wa-pair">
                    <div className="el-wa-pair__header">
                      <div className="el-wa-badge">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17.6 6.4A8 8 0 0 0 4.2 16.9L3 21l4.2-1.1a8 8 0 0 0 10.4-13.5z" />
                          <path d="M15.5 14.2c-.3-.1-1.6-.8-1.8-.9-.3-.1-.5-.1-.7.2-.2.3-.8.9-1 1.1-.2.2-.4.2-.7.1-.3-.2-1.3-.5-2.5-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.7.1-.2.3-.4.5-.6.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.1-.7-1.7-1-2.3-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4s-1.2 1.2-1.2 2.8 1.2 3.2 1.4 3.4c.2.3 2.4 3.7 5.8 5.1.8.4 1.5.6 2 .7.8.3 1.6.2 2.2.1.7-.1 2.1-.9 2.4-1.7.3-.8.3-1.6.2-1.7-.1-.2-.3-.3-.6-.5z" />
                        </svg>
                        <span>WhatsApp Multi-Dispositivo</span>
                      </div>
                      <div className={`el-wa-status ${(waConnected || waState === 'authorized') ? 'el-wa-status--connected' : 'el-wa-status--waiting'}`}>
                        <span className={(waConnected || waState === 'authorized') ? 'el-wa-status__dot' : 'el-wa-status__pulse'} />
                        <span>{(waConnected || waState === 'authorized') ? `Connesso: ${waConnectedPhone || '...'}` : 'In attesa di scansione...'}</span>
                      </div>
                    </div>

                    <div className="el-wa-pair__titles">
                      <h3>Collega WhatsApp ad Eliseo</h3>
                      <p>
                        Inquadra il codice QR con lo smartphone del salone per ricevere e inviare tutti i messaggi WhatsApp direttamente dentro Eliseo, in modo 100% automatizzato.
                      </p>
                    </div>

                    <div className="el-wa-pair__content">
                      <div className="el-wa-qr__col">
                        <div className="el-wa-qr__box">
                          {(waConnected || waState === 'authorized') ? (
                            <div className="flex flex-col items-center justify-center p-4 text-center">
                              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2">
                                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              </div>
                              <p className="text-sm font-bold text-emerald-400">WhatsApp Connesso</p>
                              <p className="text-[11px] text-white/50 mt-1 max-w-[170px]">
                                Sessione attiva con Green API. I messaggi sono sincronizzati.
                              </p>
                            </div>
                          ) : waQrLoading ? (
                            <div className="flex flex-col items-center justify-center p-6 text-center">
                              <RefreshCw size={28} className="animate-spin text-gold mb-2" />
                              <p className="text-xs text-white/60">Caricamento QR live...</p>
                            </div>
                          ) : waQrBase64 ? (
                            <img
                              src={`data:image/png;base64,${waQrBase64}`}
                              alt="Codice QR WhatsApp"
                              className="w-[170px] h-[170px] object-contain rounded-lg"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center p-4 text-center">
                              <p className="text-xs text-amber-300">Nessun QR disponibile.</p>
                              <button
                                type="button"
                                className="btn btn--secondary btn--sm mt-2"
                                onClick={refreshWaLive}
                              >
                                Riprova
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="el-wa-qr__acts">
                          <button
                            type="button"
                            className="btn btn--secondary btn--sm"
                            disabled={waQrLoading}
                            onClick={() => {
                              refreshWaLive();
                              say('Aggiornamento stato WhatsApp...');
                            }}
                          >
                            <RefreshCw size={13} className={waQrLoading ? 'animate-spin' : ''} /> Aggiorna QR
                          </button>
                          <button
                            type="button"
                            className="btn btn--secondary btn--sm"
                            onClick={async () => {
                              if (waState === 'authorized' || waConnected) {
                                say('Disconnessione WhatsApp in corso...');
                                const res = await logoutWhatsAppInstanceAction();
                                if (res.ok) {
                                  setWaConnected(false);
                                  setWaState('notAuthorized');
                                  say('WhatsApp scollegato. Generazione nuovo QR...');
                                  await refreshWaLive();
                                } else {
                                  say(res.error || 'Errore durante la disconnessione.', true);
                                }
                              } else {
                                refreshWaLive();
                                say('Aggiornamento codice QR...');
                              }
                            }}
                          >
                            {(waConnected || waState === 'authorized') ? 'Scollega' : 'Verifica stato'}
                          </button>
                        </div>
                      </div>

                      <div className="el-wa-steps">
                        <div className="el-wa-step">
                          <span className="el-wa-step__num">1</span>
                          <div>
                            <strong>Apri WhatsApp</strong>
                            <p>Sul telefono del salone{waConnectedPhone ? ` (${waConnectedPhone})` : ''}.</p>
                          </div>
                        </div>
                        <div className="el-wa-step">
                          <span className="el-wa-step__num">2</span>
                          <div>
                            <strong>Menu o Impostazioni</strong>
                            <p>Tocca i tre puntini ⋮ (Android) o Impostazioni ⚙️ (iPhone).</p>
                          </div>
                        </div>
                        <div className="el-wa-step">
                          <span className="el-wa-step__num">3</span>
                          <div>
                            <strong>Dispositivi collegati</strong>
                            <p>Tocca "Collega un dispositivo".</p>
                          </div>
                        </div>
                        <div className="el-wa-step">
                          <span className="el-wa-step__num">4</span>
                          <div>
                            <strong>Inquadra il codice QR</strong>
                            <p>Il codice è generato dall'istanza Green API ed è accettato all'istante dall'app WhatsApp.</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="el-wa-pair__footer">
                      <span>💬 In alternativa, seleziona una conversazione dall'elenco a sinistra per visualizzarla.</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: ADDESTRAMENTO */}
          {railTab === 'addestramento' && (
            <>
              {addestramentoTab === 'faq' && (
                <>
                  <header className="el-faq__head">
                    <h2>FAQ dell’assistente</h2>
                    <p>
                      Domande e risposte su cui si basa l’assistente virtuale di Barberia Garofalo.
                    </p>
                  </header>

                  <div className="el-faq__tools">
                    <label className="el-faq__find">
                      <Search className="el-faq__lens" />
                      <input
                        type="search"
                        className="el-search"
                        placeholder="Cerca nelle FAQ..."
                        value={faqQ}
                        onChange={(e) => setFaqQ(e.target.value)}
                      />
                    </label>

                    {faqSelected.size > 0 && (
                      <button
                        type="button"
                        className="btn btn--danger"
                        onClick={handleDeleteSelectedFaq}
                      >
                        Elimina {faqSelected.size}
                      </button>
                    )}

                    <div className="el-faq__dropdown-wrap">
                      <button
                        type="button"
                        className="btn el-faq__btn-nuovo"
                        onClick={() => setFaqDropdownOpen((prev) => !prev)}
                        aria-haspopup="true"
                        aria-expanded={faqDropdownOpen}
                      >
                        <Plus size={15} /> Nuovo
                      </button>

                      {faqDropdownOpen && (
                        <div className="el-faq__dropdown" role="menu">
                          <button
                            type="button"
                            className="el-faq__dropdown-item"
                            onClick={() => {
                              setEditingFaq({
                                cartella: 'Generale',
                                domanda: '',
                                parole: '',
                                risposta: '',
                                attiva: true,
                              });
                              setFaqDropdownOpen(false);
                            }}
                          >
                            <span className="el-faq__dropdown-ic"><HelpCircle size={15} /></span>
                            <span>Nuova FAQ</span>
                          </button>
                          <button
                            type="button"
                            className="el-faq__dropdown-item"
                            onClick={() => {
                              const nome = window.prompt('Inserisci il nome della nuova cartella:');
                              if (nome && nome.trim()) {
                                setEditingFaq({
                                  cartella: nome.trim(),
                                  domanda: '',
                                  parole: '',
                                  risposta: '',
                                  attiva: true,
                                });
                              }
                              setFaqDropdownOpen(false);
                            }}
                          >
                            <span className="el-faq__dropdown-ic"><Folder size={15} /></span>
                            <span>Nuova cartella</span>
                          </button>
                          <button
                            type="button"
                            className="el-faq__dropdown-item"
                            onClick={() => {
                              faqCsvInputRef.current?.click();
                              setFaqDropdownOpen(false);
                            }}
                          >
                            <span className="el-faq__dropdown-ic"><Upload size={15} /></span>
                            <span>Importa CSV</span>
                          </button>
                        </div>
                      )}

                      <input
                        ref={faqCsvInputRef}
                        type="file"
                        accept=".csv,text/csv"
                        className="hidden"
                        style={{ display: 'none' }}
                        onChange={handleFaqCsvImport}
                      />
                    </div>
                  </div>

                  {editingFaq && (
                    <section className="pcard">
                      <h3 className="pcard__title">
                        {editingFaq.id ? 'Modifica FAQ' : 'Nuova FAQ'}
                      </h3>
                      <div className="el-form">
                        <div className="el-grid">
                          <label className="field">
                            <span>Cartella</span>
                            <input
                              type="text"
                              value={editingFaq.cartella || 'Generale'}
                              onChange={(e) => setEditingFaq({ ...editingFaq, cartella: e.target.value })}
                            />
                          </label>
                          <label className="field">
                            <span>Domanda</span>
                            <input
                              type="text"
                              value={editingFaq.domanda || ''}
                              onChange={(e) => setEditingFaq({ ...editingFaq, domanda: e.target.value })}
                            />
                          </label>
                        </div>
                        <label className="field">
                          <span>Parole chiave (separate da virgola)</span>
                          <input
                            type="text"
                            placeholder="es. spostare, disdire, costo, barba panno caldo"
                            value={editingFaq.parole || ''}
                            onChange={(e) => setEditingFaq({ ...editingFaq, parole: e.target.value })}
                          />
                        </label>
                        <label className="field">
                          <span>Risposta fornita dall’assistente</span>
                          <textarea
                            rows={3}
                            value={editingFaq.risposta || ''}
                            onChange={(e) => setEditingFaq({ ...editingFaq, risposta: e.target.value })}
                          />
                        </label>
                        <label className="el-consent">
                          <input
                            type="checkbox"
                            checked={editingFaq.attiva ?? true}
                            onChange={(e) => setEditingFaq({ ...editingFaq, attiva: e.target.checked })}
                          />
                          <span>Attiva (utilizzata dall’assistente del sito)</span>
                        </label>
                        <div className="actions">
                          <button type="button" className="btn btn--primary" onClick={handleSaveFaq}>
                            Salva FAQ
                          </button>
                          <button type="button" className="btn btn--secondary" onClick={() => setEditingFaq(null)}>
                            Chiudi
                          </button>
                        </div>
                      </div>
                    </section>
                  )}

                  <p className="el-faq__all">Tutte le FAQ ({filteredFaqs.length})</p>
                  <div className="el-faq__list">
                    {filteredFaqs.length === 0 ? (
                      <p className="pempty">Nessuna FAQ presente.</p>
                    ) : (
                      filteredFaqs.map((f) => (
                        <article key={f.id} className="el-faq__row">
                          <input
                            type="checkbox"
                            checked={faqSelected.has(f.id)}
                            onChange={(e) => {
                              const next = new Set(faqSelected);
                              if (e.target.checked) next.add(f.id);
                              else next.delete(f.id);
                              setFaqSelected(next);
                            }}
                          />
                          <span className="el-faq__mark" data-off={!f.attiva ? '' : undefined}>
                            ✓
                          </span>
                          <button
                            type="button"
                            className="el-faq__open"
                            onClick={() => setEditingFaq({ ...f })}
                          >
                            <span className="el-faq__top">
                              <strong>{f.domanda}</strong>
                              <time>{f.cartella}</time>
                            </span>
                            <span className="el-faq__prev">{f.risposta}</span>
                          </button>
                        </article>
                      ))
                    )}
                  </div>
                </>
              )}

              {addestramentoTab === 'sito' && (
                <>
                  <header className="el-faq__head">
                    <h2>Sito web</h2>
                    <p>Le pagine del sito che l’assistente legge per rispondere ai clienti.</p>
                  </header>

                  <div className="el-web__row is-on">
                    <Globe className="text-[#e5b565]" size={20} />
                    <strong className="el-web__host">barberiagarofalo.it</strong>
                    <span className="el-web__meta">
                      <span>{PAGES.length} pagine lette</span>
                      <span>Sincronizzato</span>
                    </span>
                    <button
                      type="button"
                      className="el-web__icon"
                      title="Ricarica"
                      onClick={() => say('Mappa del sito aggiornata.')}
                    >
                      <RefreshCw size={16} />
                    </button>
                  </div>

                  <p className="el-web__count">Pagine indicizzate nel motore di risposta:</p>
                  <div className="el-web__pages">
                    {PAGES.map(([url, title]) => (
                      <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                        <strong>{title}</strong> · <span className="opacity-60">{url}</span>
                      </a>
                    ))}
                  </div>
                </>
              )}

              {addestramentoTab === 'documenti' && (
                <>
                  <header className="el-faq__head">
                    <h2>File & Conoscenza</h2>
                    <p>Documenti e note che l’assistente legge per arricchire le risposte.</p>
                  </header>

                  <label className="el-file__drop">
                    <FileText className="el-file__ico" />
                    <strong>Carica o trascina il tuo file qui</strong>
                    <span>Accettiamo file .pdf, .docx, .txt, .csv fino a 30MB</span>
                    <input
                      type="file"
                      className="el-file__pick"
                      multiple
                      accept=".pdf,.docx,.csv,.tsv,.txt,.md"
                      onChange={handleFileUpload}
                    />
                  </label>

                  <div className="el-file__sheetwrap mt-3">
                    <button
                      type="button"
                      className="btn btn--secondary"
                      onClick={() =>
                        setEditingDoc({
                          titolo: 'Note salone',
                          testo: '',
                          attivo: true,
                        })
                      }
                    >
                      <Plus size={15} /> Incolla testo manualmente
                    </button>
                  </div>

                  {editingDoc && (
                    <section className="pcard mt-4">
                      <h3 className="pcard__title">
                        {editingDoc.id ? 'Modifica documento' : 'Nuovo documento di testo'}
                      </h3>
                      <div className="el-form">
                        <label className="field">
                          <span>Titolo</span>
                          <input
                            type="text"
                            value={editingDoc.titolo || ''}
                            onChange={(e) => setEditingDoc({ ...editingDoc, titolo: e.target.value })}
                          />
                        </label>
                        <label className="field">
                          <span>Contenuto testuale (max 20.000 caratteri)</span>
                          <textarea
                            rows={8}
                            value={editingDoc.testo || ''}
                            onChange={(e) => setEditingDoc({ ...editingDoc, testo: e.target.value })}
                          />
                        </label>
                        <div className="actions">
                          <button type="button" className="btn btn--primary" onClick={handleSaveDocumento}>
                            Salva file
                          </button>
                          <button type="button" className="btn btn--secondary" onClick={() => setEditingDoc(null)}>
                            Chiudi
                          </button>
                        </div>
                      </div>
                    </section>
                  )}

                  <p className="el-faq__all mt-4">File caricati ({docList.length})</p>
                  <div className="el-file__list">
                    {docList.length === 0 ? (
                      <p className="pempty">Nessun file presente.</p>
                    ) : (
                      docList.map((doc) => (
                        <article key={doc.id} className="el-file__row">
                          <FileText className="el-file__glyph" />
                          <button
                            type="button"
                            className="el-file__open"
                            onClick={() => setEditingDoc({ ...doc })}
                          >
                            <strong>{doc.titolo}</strong>
                            <time>{doc.aggiornato_il ? new Date(doc.aggiornato_il).toLocaleDateString('it-IT') : ''}</time>
                          </button>
                          <span className="el-file__size">{doc.testo.length} caratteri</span>
                          <button
                            type="button"
                            className="el-web__icon text-red-400 hover:text-red-300"
                            onClick={() => handleDeleteDocumento(doc.id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </article>
                      ))
                    )}
                  </div>
                </>
              )}

              {addestramentoTab === 'istruzioni' && (
                <>
                  <div className="el-prompt__top">
                    <header className="el-faq__head">
                      <h2>Prompt dell’assistente</h2>
                      <p>
                        Le istruzioni che Eliseo segue in ogni conversazione con i clienti.
                      </p>
                    </header>
                    <button
                      type="button"
                      className="el-prompt__hist"
                      onClick={() => setIsPromptHistoryOpen(!isPromptHistoryOpen)}
                    >
                      <Clock className="el-prompt__clock" />
                      <span>Cronologia versioni</span>
                      <b>{versioniPrompt.length}</b>
                    </button>
                  </div>

                  {isPromptHistoryOpen && (
                    <div className="el-prompt__log">
                      {versioniPrompt.length === 0 ? (
                        <p>Nessuna versione precedente.</p>
                      ) : (
                        versioniPrompt.map((v) => (
                          <div key={v.id} className="el-prompt__ver">
                            <div>
                              <strong>{new Date(v.creato_il).toLocaleString('it-IT')}</strong>
                              <span>{v.istruzioni.slice(0, 100)}...</span>
                            </div>
                            <button
                              type="button"
                              className="btn btn--secondary"
                              onClick={() => {
                                setPromptText(v.istruzioni);
                                say('Versione caricata. Premi Salva per applicarla.');
                              }}
                            >
                              Usa questa
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  <section className="el-prompt__card">
                    <div className="el-prompt__aihead">
                      <span className="el-prompt__spark">
                        <Sparkles />
                      </span>
                      <div>
                        <h3>Migliora con l’AI</h3>
                        <p>
                          Scrivi cosa cambiare nel comportamento del chatbot: verrà integrato nel prompt.
                        </p>
                      </div>
                      <span className="el-prompt__keys">
                        <kbd>Ctrl</kbd>
                        <kbd>K</kbd>
                      </span>
                    </div>

                    <textarea
                      className="el-prompt__ask"
                      placeholder='Es. "Rispondi in modo più breve e ricorda sempre di prenotare dal sito"'
                      value={aiImproveInput}
                      onChange={(e) => setAiImproveInput(e.target.value)}
                    />

                    <div className="el-prompt__apply">
                      <span className="el-prompt__hint">Premi Migliora per integrare</span>
                      <button
                        type="button"
                        className="btn btn--primary"
                        onClick={() => handleApplyAiImprove()}
                      >
                        Migliora prompt
                      </button>
                    </div>

                    <div className="el-prompt__chips">
                      {[
                        'Rispondi in modo più breve',
                        'Usa un tono più caldo e amichevole',
                        'Usa un tono più formale',
                        'Ricorda sempre il link di prenotazione',
                        'Incentiva il trattamento barba con panno caldo',
                      ].map((phrase) => (
                        <button
                          key={phrase}
                          type="button"
                          className="el-prompt__chip"
                          onClick={() => handleApplyAiImprove(phrase)}
                        >
                          {phrase}
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="el-prompt__card">
                    <div className="el-prompt__bar">
                      <div className="el-prompt__name">
                        <strong>Prompt principale</strong>
                        <span className="el-prompt__state" data-dirty={isPromptDirty ? '' : undefined}>
                          <span className="el-prompt__dot" />
                          <span>{isPromptDirty ? 'Modificato' : 'Salvato'}</span>
                        </span>
                      </div>
                      <div className="el-prompt__meta">
                        <span className="el-prompt__count">{promptText.length} / 10.000</span>
                        <button
                          type="button"
                          className="btn btn--primary"
                          disabled={!isPromptDirty}
                          onClick={handleSavePrompt}
                        >
                          Salva prompt
                        </button>
                      </div>
                    </div>

                    <textarea
                      className="el-prompt__text"
                      rows={12}
                      value={promptText}
                      onChange={(e) => setPromptText(e.target.value)}
                    />
                  </section>
                </>
              )}

              {addestramentoTab === 'passaggio' && (
                <>
                  <header className="el-faq__head">
                    <h2>Escalation & Passaggio al team</h2>
                    <p>Regole su quando l’assistente passa la parola a Luigi o ai barbieri del salone.</p>
                  </header>

                  <section className="pcard">
                    <div className="el-form">
                      <label className="el-consent">
                        <input
                          type="checkbox"
                          checked={assistente.escalation_attiva}
                          onChange={(e) => handleToggleEscalation(e.target.checked)}
                        />
                        <span>Attiva il passaggio automatico al team quando il cliente lo richiede</span>
                      </label>

                      <label className="el-consent">
                        <input
                          type="checkbox"
                          checked={assistente.testo_libero}
                          onChange={(e) => handleToggleTestoLibero(e.target.checked)}
                        />
                        <span>Consenti ai clienti di scrivere domande a testo libero nella chat del sito</span>
                      </label>
                    </div>
                  </section>

                  <section className="pcard">
                    <h3 className="pcard__title">Orari di disponibilità del salone</h3>
                    <p className="pcard__note">
                      Negli orari di chiusura o fuori turno, l’assistente informa il cliente e invita a prenotare online.
                    </p>
                    <ul className="plist">
                      <li>
                        <strong>Martedì – Venerdì</strong>
                        <span>08:30 – 13:00 / 15:30 – 20:30</span>
                        <span>Aperto</span>
                      </li>
                      <li>
                        <strong>Sabato</strong>
                        <span>08:30 – 14:00 / 14:30 – 20:00</span>
                        <span>Orario continuato</span>
                      </li>
                      <li>
                        <strong>Domenica & Lunedì</strong>
                        <span className="text-red-400">Chiuso</span>
                        <span>Riposo settimanale</span>
                      </li>
                    </ul>
                  </section>
                </>
              )}

              {addestramentoTab === 'integrazioni' && (
                <>
                  <header className="el-faq__head">
                    <h2>Canali & Integrazioni</h2>
                    <p>Stato dei collegamenti con il salone e le piattaforme esterne.</p>
                  </header>

                  <ul className="plist">
                    <li>
                      <strong>Sito del salone</strong>
                      <span className="text-green-400">In uso</span>
                      <span>Lettura automatica pagine e servizi</span>
                    </li>
                    <li>
                      <strong>FAQ e documenti</strong>
                      <span className="text-green-400">In uso</span>
                      <span>Base di conoscenza attiva</span>
                    </li>
                    <li>
                      <strong>WhatsApp Business</strong>
                      <span>Numero salone</span>
                      <span>+39 388 423 3929</span>
                    </li>
                    <li>
                      <strong>Prenotazioni online</strong>
                      <span className="text-green-400">Attive</span>
                      <span>Calendario interno Barberia Garofalo</span>
                    </li>
                    <li>
                      <strong>Notifiche Push</strong>
                      <span className="text-green-400">Attive</span>
                      <span>Campagne e avvisi ai clienti registrati</span>
                    </li>
                  </ul>
                </>
              )}
            </>
          )}

          {/* TAB: AUTOMAZIONI */}
          {railTab === 'automazioni' && (
            <>
              <header className="el-faq__head">
                <h2>Automazioni</h2>
                <p>
                  Regole «quando succede questo, fai quello». Vengono eseguite direttamente nel database anche a sito chiuso.
                </p>
              </header>

              <div className="el-auto__list">
                {automazioni.length === 0 ? (
                  <p className="pempty">Nessuna automazione attiva. Creane una qui sotto.</p>
                ) : (
                  automazioni.map((auto) => (
                    <article key={auto.id} className="el-auto__row">
                      <div className="el-auto__desc">
                        <strong>{auto.nome}</strong>
                        <p>{describeAutomazione(auto)}</p>
                        <small>Eseguita {auto.eseguite} volte</small>
                      </div>
                      <div className="el-auto__acts">
                        <label className="el-consent m-0">
                          <input
                            type="checkbox"
                            checked={auto.attiva}
                            onChange={() => handleToggleAutomazione(auto.id, auto.attiva)}
                          />
                          <span>{auto.attiva ? 'Attiva' : 'Disattivata'}</span>
                        </label>
                        <button
                          type="button"
                          className="el-web__icon text-red-400 hover:text-red-300"
                          onClick={() => handleDeleteAutomazione(auto.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>

              <section className="pcard">
                <h3 className="pcard__title">Crea nuova automazione</h3>
                <form onSubmit={handleCreateAutomazione} className="el-form">
                  <label className="field">
                    <span>Nome dell’automazione</span>
                    <input
                      type="text"
                      placeholder="Es. Assegna richieste a Luigi"
                      value={autoNome}
                      onChange={(e) => setAutoNome(e.target.value)}
                    />
                  </label>

                  <div className="el-grid">
                    <label className="field">
                      <span>Quando succede questo</span>
                      <select
                        value={autoQuando}
                        onChange={(e) =>
                          setAutoQuando(
                            e.target.value as 'nuova_richiesta' | 'nuova_chat' | 'nuovo_contatto' | 'cambio_fase'
                          )
                        }
                      >
                        {QUANDO_AUTO.map(([k, t]) => (
                          <option key={k} value={k}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </label>

                    {CONDIZIONI_AUTO[autoQuando] && (
                      <label className="field">
                        <span>{CONDIZIONI_AUTO[autoQuando]![0]}</span>
                        <select
                          value={autoCondizione}
                          onChange={(e) => setAutoCondizione(e.target.value)}
                        >
                          <option value="">Sempre (qualsiasi)</option>
                          {CONDIZIONI_AUTO[autoQuando]![1].map(([k, t]) => (
                            <option key={k} value={k}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>

                  <div className="el-grid">
                    <label className="field">
                      <span>Allora fai questo</span>
                      <select
                        value={autoAzione}
                        onChange={(e) =>
                          setAutoAzione(
                            e.target.value as 'assegna' | 'crea_contatto' | 'etichetta' | 'fase' | 'barbiere'
                          )
                        }
                      >
                        {(AZIONI_AUTO[autoQuando] || []).map(([k, t]) => (
                          <option key={k} value={k}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="field">
                      <span>Valore da assegnare</span>
                      {autoAzione === 'fase' ? (
                        <select value={autoValore} onChange={(e) => setAutoValore(e.target.value)}>
                          {FASI.map(([k, t]) => (
                            <option key={k} value={k}>
                              {t}
                            </option>
                          ))}
                        </select>
                      ) : autoAzione === 'assegna' || autoAzione === 'barbiere' ? (
                        <select value={autoValore} onChange={(e) => setAutoValore(e.target.value)}>
                          {team.map((p) => (
                            <option key={p.id} value={p.nome}>
                              {p.nome}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          placeholder="es. vip, sposo, ritardatario"
                          value={autoValore}
                          onChange={(e) => setAutoValore(e.target.value)}
                        />
                      )}
                    </label>
                  </div>

                  <div className="actions mt-3">
                    <button type="submit" className="btn btn--primary">
                      Crea automazione
                    </button>
                  </div>
                </form>
              </section>
            </>
          )}

          {/* TAB: CONTATTI */}
          {railTab === 'contatti' && (
            <>
              {contattiTab === 'elenco' && (
                <>
                  <header className="el-pagehead">
                    <h2>Rubrica Clienti</h2>
                    <div className="el-pagehead__act">
                      <div className="el-switch" role="group">
                        <button
                          type="button"
                          aria-pressed={contactView === 'lista'}
                          onClick={() => setContactView('lista')}
                        >
                          Lista
                        </button>
                        <button
                          type="button"
                          aria-pressed={contactView === 'kanban'}
                          onClick={() => setContactView('kanban')}
                        >
                          Kanban
                        </button>
                      </div>
                      <span className="el-count">{filteredContatti.length} contatti</span>
                    </div>
                  </header>

                  <div className="el-tools">
                    <input
                      type="search"
                      className="el-search"
                      placeholder="Cerca nome, email o telefono"
                      value={contactQ}
                      onChange={(e) => setContactQ(e.target.value)}
                    />

                    {contactView === 'lista' && (
                      <select
                        className="el-fase"
                        value={contactFaseFilter}
                        onChange={(e) => setContactFaseFilter(e.target.value)}
                      >
                        <option value="">Tutte le fasi</option>
                        {FASI.map(([k, t]) => (
                          <option key={k} value={k}>
                            {t}
                          </option>
                        ))}
                      </select>
                    )}

                    <div className="el-tools__act">
                      <button type="button" className="btn btn--primary" onClick={handleOpenNewContact}>
                        <Plus size={15} /> Nuovo contatto
                      </button>
                      <button type="button" className="btn btn--secondary" onClick={handleCopyIscritti}>
                        Copia iscritti al sito
                      </button>
                      <button type="button" className="btn btn--secondary" onClick={() => setIsCsvModalOpen(true)}>
                        <Upload size={15} /> Importa da CSV
                      </button>
                    </div>
                  </div>

                  {contactView === 'lista' ? (
                    <div className="table-wrap">
                      <table className="ptable">
                        <thead>
                          <tr>
                            <th>Nome</th>
                            <th>Contatto</th>
                            <th>Fonte</th>
                            <th>Fase</th>
                            <th>Barbiere</th>
                            <th>Consenso</th>
                            <th>Aggiornato</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredContatti.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="pempty">
                                Nessun contatto trovato con questi filtri.
                              </td>
                            </tr>
                          ) : (
                            filteredContatti.map((c) => (
                              <tr key={c.id}>
                                <td>
                                  <button
                                    type="button"
                                    className="link-button"
                                    onClick={() => handleOpenEditContact(c)}
                                  >
                                    {c.nome}
                                  </button>
                                  {(c.etichette || []).length > 0 && (
                                    <div className="el-tags">
                                      {c.etichette.map((t) => (
                                        <span key={t} className="el-tag">
                                          {t}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </td>
                                <td>{c.telefono || c.email || '—'}</td>
                                <td>{c.fonte}</td>
                                <td>
                                  <select
                                    className="el-fase text-xs"
                                    value={c.fase}
                                    onChange={(e) => handleSetFase(c.id, e.target.value as Fase)}
                                  >
                                    {FASI.map(([k, t]) => (
                                      <option key={k} value={k}>
                                        {t}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td>{c.barbiere || '—'}</td>
                                <td>
                                  <span className={`pchip ${c.consenso_marketing ? 'pchip--ok' : 'pchip--wait'}`}>
                                    {c.consenso_marketing ? 'Sì' : 'No'}
                                  </span>
                                </td>
                                <td>{c.aggiornato_il ? new Date(c.aggiornato_il).toLocaleDateString('it-IT') : '—'}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="el-cols">
                      {FASI.map(([faseKey, faseTitle]) => {
                        const items = filteredContatti.filter((c) => c.fase === faseKey);
                        return (
                          <section key={faseKey} className="el-col">
                            <header className="el-col__head">
                              <span>{faseTitle}</span>
                              <span className="el-col__n">{items.length}</span>
                            </header>
                            <div className="el-col__list">
                              {items.length === 0 ? (
                                <p className="el-col__empty">Vuota</p>
                              ) : (
                                items.map((c) => (
                                  <article key={c.id} className="el-card">
                                    <button
                                      type="button"
                                      className="link-button font-bold text-sm text-left"
                                      onClick={() => handleOpenEditContact(c)}
                                    >
                                      {c.nome}
                                    </button>
                                    <p className="el-card__meta">
                                      {c.telefono || c.email || 'Nessun recapito'}
                                    </p>
                                    {c.consenso_marketing && (
                                      <span className="pchip pchip--ok w-fit">Consenso</span>
                                    )}
                                    <select
                                      className="el-move"
                                      value={c.fase}
                                      onChange={(e) => handleSetFase(c.id, e.target.value as Fase)}
                                    >
                                      {FASI.map(([k, t]) => (
                                        <option key={k} value={k}>
                                          Sposta in: {t}
                                        </option>
                                      ))}
                                    </select>
                                  </article>
                                ))
                              )}
                            </div>
                          </section>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {contattiTab === 'campagne' && (
                <>
                  <header className="el-pagehead">
                    <h2>Campagne Notifiche Push</h2>
                  </header>

                  <section className="pcard">
                    <h3 className="pcard__title">Nuova Campagna</h3>
                    <p className="pcard__note">
                      Viene inviata gratuitamente come notifica push ai clienti con consenso marketing e notifiche abilitate.
                    </p>

                    <form onSubmit={handleSendCampagna} className="el-form">
                      <label className="field">
                        <span>Nome interno della campagna</span>
                        <input
                          type="text"
                          placeholder="es. Promozione Autunno Barba"
                          value={campNome}
                          onChange={(e) => setCampNome(e.target.value)}
                        />
                      </label>

                      <div className="field">
                        <span>A chi inviare (fasi)</span>
                        <div className="flex flex-wrap gap-4 mt-2">
                          {FASI.map(([k, t]) => (
                            <label key={k} className="el-consent m-0">
                              <input
                                type="checkbox"
                                checked={campFasi.includes(k)}
                                onChange={(e) => {
                                  if (e.target.checked) setCampFasi([...campFasi, k]);
                                  else setCampFasi(campFasi.filter((x) => x !== k));
                                }}
                              />
                              <span>{t}</span>
                            </label>
                          ))}
                        </div>
                        <p className="field__hint">
                          Destinatari stimati: <strong>{campaignRecipientsCount} clienti</strong> con consenso marketing attivo.
                        </p>
                      </div>

                      <div className="el-grid">
                        <label className="field">
                          <span>Titolo della notifica (max 60 car.)</span>
                          <input
                            type="text"
                            maxLength={60}
                            placeholder="es. Il tuo stile ti aspetta"
                            value={campTitolo}
                            onChange={(e) => setCampTitolo(e.target.value)}
                          />
                        </label>

                        <label className="field">
                          <span>Pagina di atterraggio</span>
                          <select value={campUrl} onChange={(e) => setCampUrl(e.target.value)}>
                            {PAGES.map(([url, title]) => (
                              <option key={url} value={url}>
                                {title} ({url})
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <label className="field">
                        <span>Testo del messaggio (max 160 car.)</span>
                        <textarea
                          rows={2}
                          maxLength={160}
                          placeholder="es. Prenota il tuo taglio o trattamento barba su misura questa settimana."
                          value={campTesto}
                          onChange={(e) => setCampTesto(e.target.value)}
                        />
                      </label>

                      <div className="actions mt-3">
                        <button
                          type="submit"
                          className="btn btn--primary"
                          disabled={campaignRecipientsCount === 0 || isPending}
                        >
                          Invia campagna ({campaignRecipientsCount} destinatari)
                        </button>
                      </div>
                    </form>
                  </section>

                  <section className="pcard mt-4">
                    <h3 className="pcard__title">Storico invii</h3>
                    <div className="table-wrap">
                      <table className="ptable">
                        <thead>
                          <tr>
                            <th>Nome</th>
                            <th>Data</th>
                            <th>Target</th>
                            <th>Inviati</th>
                            <th>Falliti</th>
                          </tr>
                        </thead>
                        <tbody>
                          {campagne.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="pempty">
                                Nessuna campagna inviata finora.
                              </td>
                            </tr>
                          ) : (
                            campagne.map((c) => (
                              <tr key={c.id}>
                                <td>
                                  <strong>{c.nome}</strong>
                                  <div className="text-xs text-white/50">{c.titolo}</div>
                                </td>
                                <td>{new Date(c.creato_il).toLocaleDateString('it-IT')}</td>
                                <td>{(c.fasi || []).join(', ')}</td>
                                <td className="text-green-400 font-bold">{c.inviati}</td>
                                <td className="text-red-400">{c.falliti}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </>
              )}

              {contattiTab === 'modelli' && (
                <>
                  <header className="el-pagehead">
                    <h2>Modelli di Messaggio</h2>
                    <p>Testi pronti da utilizzare nella casella WhatsApp ed email con tag dinamici.</p>
                  </header>

                  <div className="el-models">
                    {CATEGORIE.map(([catKey, catTitle]) => {
                      const list = modelli.filter((m) => m.categoria === catKey);
                      if (!list.length) return null;
                      return (
                        <div key={catKey}>
                          <h4 className="el-models__cat">{catTitle}</h4>
                          {list.map((m) => (
                            <details key={m.id} className="el-model">
                              <summary>
                                <strong>{m.nome}</strong>
                                <span>{m.testo.slice(0, 90)}...</span>
                              </summary>
                              <div className="el-form p-4">
                                <p className="pcard__note">
                                  Anteprima: <em>{fillTemplate(m.testo, { nome: 'Marco', barbiere: 'Luigi' })}</em>
                                </p>
                                <textarea
                                  rows={3}
                                  value={m.testo}
                                  onChange={(e) => {
                                    const next = modelli.map((x) => (x.id === m.id ? { ...x, testo: e.target.value } : x));
                                    setModelli(next);
                                  }}
                                />
                                <div className="actions">
                                  <button
                                    type="button"
                                    className="btn btn--primary"
                                    onClick={() => {
                                      startTransition(async () => {
                                        await saveModelloAction(m);
                                        say('Modello aggiornato.');
                                      });
                                    }}
                                  >
                                    Salva modifiche
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn--secondary"
                                    onClick={() => {
                                      navigator.clipboard.writeText(m.testo);
                                      say('Testo copiato negli appunti.');
                                    }}
                                  >
                                    <Copy size={15} /> Copia testo
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn--danger"
                                    onClick={() => handleDeleteModello(m.id)}
                                  >
                                    Elimina
                                  </button>
                                </div>
                              </div>
                            </details>
                          ))}
                        </div>
                      );
                    })}
                  </div>

                  <section className="pcard mt-4">
                    <h3 className="pcard__title">Crea nuovo modello</h3>
                    <div className="el-form">
                      <div className="el-grid">
                        <label className="field">
                          <span>Nome modello</span>
                          <input
                            type="text"
                            placeholder="es. Promemoria taglio 30 giorni"
                            value={nuovoModelloNome}
                            onChange={(e) => setNuovoModelloNome(e.target.value)}
                          />
                        </label>
                        <label className="field">
                          <span>Categoria</span>
                          <select
                            value={nuovoModelloCat}
                            onChange={(e) => setNuovoModelloCat(e.target.value as Categoria)}
                          >
                            {CATEGORIE.map(([k, t]) => (
                              <option key={k} value={k}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <label className="field">
                        <span>{"Testo del modello (usa {nome} e {barbiere})"}</span>
                        <textarea
                          rows={3}
                          value={nuovoModelloTesto}
                          onChange={(e) => setNuovoModelloTesto(e.target.value)}
                        />
                      </label>

                      <div className="actions mt-2">
                        <button type="button" className="btn btn--primary" onClick={handleSaveNuovoModello}>
                          Aggiungi modello
                        </button>
                      </div>
                    </div>
                  </section>
                </>
              )}
            </>
          )}

          {/* TAB: PRENOTAZIONI */}
          {railTab === 'prenota' && (
            <div>
              <header className="el-pagehead">
                <h2>Prenotazioni Salone</h2>
              </header>
              <section className="pcard">
                <h3 className="pcard__title">Gestione Appuntamenti Barberia Garofalo</h3>
                <p className="pcard__note">
                  Il salone utilizza il sistema di prenotazioni integrato nel sito con gestione disponibilità, orari dei barbieri e notifiche automatiche.
                </p>
                <div className="actions mt-4 flex gap-3">
                  <Link href="/admin/prenotazioni" className="btn btn--primary">
                    Apri Gestionale Prenotazioni
                  </Link>
                  <a href={prenotaUrl} target="_blank" rel="noopener noreferrer" className="btn btn--secondary flex items-center gap-2">
                    <ExternalLink size={15} /> Pagina Prenota Cliente
                  </a>
                </div>
              </section>
            </div>
          )}

          {/* TAB: PROVA CHATBOT */}
          {railTab === 'prova' && (
            <div>
              <header className="el-pagehead">
                <h2>Simulatore Prova Chatbot</h2>
                <p>
                  Fai domande come farebbe un cliente per verificare in tempo reale le risposte dell’assistente Eliseo.
                </p>
              </header>

              <section className="pcard">
                <div className="flex flex-wrap gap-2 mb-4">
                  {[
                    'Quanto costa un taglio?',
                    'Siete aperti sabato?',
                    'Posso spostare il mio appuntamento?',
                    'Quali servizi di barba offrite?',
                    'Voglio parlare con Luigi Garofalo',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className="btn btn--secondary text-xs"
                      onClick={() => handleSendChatMessage(preset)}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <div className="el-chat">
                  {chatMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`el-chat__msg ${msg.sender === 'user' ? 'el-chat__msg--user' : 'el-chat__msg--bot'}`}
                    >
                      <p>{msg.text}</p>
                      {msg.motivo && <small>{msg.motivo}</small>}
                    </div>
                  ))}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendChatMessage();
                  }}
                  className="el-chat__form mt-4"
                >
                  <input
                    type="text"
                    className="el-search flex-1"
                    placeholder="Scrivi una domanda all'assistente..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                  />
                  <button type="submit" className="btn btn--primary">
                    <Send size={16} /> Invia
                  </button>
                </form>
              </section>
            </div>
          )}

          {/* TAB: ANALISI */}
          {railTab === 'analisi' && (
            <div>
              <header className="el-pagehead">
                <h2>Analisi & Statistiche CRM</h2>
                <p>Panoramica completa sui clienti, frequenza di visita e fidelizzazione.</p>
              </header>

              <div className="el-kpis">
                <article className="el-kpi">
                  <span>Clienti Totali</span>
                  <b>{statsSummary.totale}</b>
                  <small>in rubrica</small>
                </article>
                <article className="el-kpi">
                  <span>Con Consenso</span>
                  <b>{statsSummary.consenso}</b>
                  <small>ricevono promozioni</small>
                </article>
                <article className="el-kpi">
                  <span>Nuovi (7 giorni)</span>
                  <b>{statsSummary.nuovi}</b>
                  <small>prime visite</small>
                </article>
                <article className="el-kpi">
                  <span>Da Richiamare</span>
                  <b>{statsSummary.richiamare}</b>
                  <small>tempo giusto trascorso</small>
                </article>
              </div>
            </div>
          )}

          {/* TAB: INTEGRAZIONI (IMPOSTAZIONI) */}
          {railTab === 'integrazioni' && (
            <div>
              <header className="el-pagehead">
                <h2>Impostazioni Canali & Integrazioni</h2>
              </header>

              <ul className="plist">
                <li>
                  <strong>Sito del salone</strong>
                  <span>In uso</span>
                  <span>barberiagarofalo.it (Lettura automatica contenuti)</span>
                </li>
                <li>
                  <strong>FAQ & File Conoscenza</strong>
                  <span>In uso</span>
                  <span>{faqList.length} FAQ e {docList.length} documenti attivi</span>
                </li>
                <li>
                  <strong>WhatsApp</strong>
                  <span>+39 388 423 3929</span>
                  <span>Canale prioritario di risposta al cliente</span>
                </li>
                <li>
                  <strong>Gestionale Prenotazioni</strong>
                  <span>In uso</span>
                  <span>Orari barbieri, sovrapposizioni e combo gestite nativamente</span>
                </li>
                <li>
                  <strong>Email</strong>
                  <span>Notifiche attive</span>
                  <span>Avvisi di sistema ed email di riepilogo</span>
                </li>
                <li>
                  <strong>Instagram</strong>
                  <span>Collegato</span>
                  <span>@barberiagarofalo</span>
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Status Bar */}
        {statusMsg && (
          <p className="el-status" data-state={statusBad ? 'error' : 'ok'}>
            {statusMsg}
          </p>
        )}
      </div>

      
      {/* MODALE SCELTA CANALE NUOVA CONVERSAZIONE (STILE KEPLERO) */}
      {channelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-[rgba(205,154,79,0.3)] bg-[#17110b] p-6 shadow-2xl text-[#f7ecd0]">
            <div className="flex items-center justify-between border-b border-[rgba(205,154,79,0.15)] pb-3">
              <h3 className="text-lg font-bold">
                {channelModal === 'pick' && 'Scegli un canale per iniziare una nuova conversazione'}
                {channelModal === 'whatsapp' && 'Nuova conversazione WhatsApp'}
                {channelModal === 'email' && 'Nuova email dal CRM'}
              </h3>
              <button
                type="button"
                onClick={() => setChannelModal(null)}
                className="text-white/40 hover:text-white transition"
              >
                <X size={20} />
              </button>
            </div>

            {channelModal === 'pick' && (
              <div className="grid grid-cols-2 gap-4 py-6">
                <button
                  type="button"
                  onClick={() => setChannelModal('whatsapp')}
                  className="flex items-center justify-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-4 text-emerald-400 font-bold hover:bg-emerald-900/60 transition"
                >
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.6 6.4A8 8 0 0 0 4.2 16.9L3 21l4.2-1.1a8 8 0 0 0 10.4-13.5z" />
                    <path d="M15.5 14.2c-.3-.1-1.6-.8-1.8-.9-.3-.1-.5-.1-.7.2-.2.3-.8.9-1 1.1-.2.2-.4.2-.7.1-.3-.2-1.3-.5-2.5-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.7.1-.2.3-.4.5-.6.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.1-.7-1.7-1-2.3-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4s-1.2 1.2-1.2 2.8 1.2 3.2 1.4 3.4c.2.3 2.4 3.7 5.8 5.1.8.4 1.5.6 2 .7.8.3 1.6.2 2.2.1.7-.1 2.1-.9 2.4-1.7.3-.8.3-1.6.2-1.7-.1-.2-.3-.3-.6-.5z" />
                  </svg>
                  <span>WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => setChannelModal('email')}
                  className="flex items-center justify-center gap-3 rounded-xl border border-[rgba(205,154,79,0.3)] bg-black/40 p-4 text-[#f7ecd0] font-bold hover:bg-[rgba(205,154,79,0.15)] transition"
                >
                  <Mail size={22} className="text-[#cd9a4f]" />
                  <span>Email</span>
                </button>
              </div>
            )}

            {channelModal === 'whatsapp' && (
              <div className="space-y-4 pt-4">
                <label className="block">
                  <span className="text-xs uppercase tracking-wider text-white/50">Contatto salvato</span>
                  <select
                    className="mt-1 w-full rounded-lg border border-[rgba(205,154,79,0.3)] bg-[#211810] p-2 text-sm text-[#f7ecd0]"
                    onChange={(e) => {
                      const f = contatti.find((c) => c.telefono === e.target.value);
                      if (f) {
                        setNewWaPhone(f.telefono || '');
                        setNewWaName(f.nome || '');
                      }
                    }}
                  >
                    <option value="">— Inserisci nuovo numero —</option>
                    {contatti.filter((c) => c.telefono).map((c) => (
                      <option key={c.id} value={c.telefono || ''}>{c.nome} ({c.telefono})</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs uppercase tracking-wider text-white/50">Numero WhatsApp *</span>
                  <input
                    type="tel"
                    value={newWaPhone}
                    onChange={(e) => setNewWaPhone(e.target.value)}
                    placeholder="+39 3..."
                    className="mt-1 w-full rounded-lg border border-[rgba(205,154,79,0.3)] bg-[#211810] p-2 text-sm text-[#f7ecd0]"
                  />
                </label>

                <label className="block">
                  <span className="text-xs uppercase tracking-wider text-white/50">Nome contatto</span>
                  <input
                    type="text"
                    value={newWaName}
                    onChange={(e) => setNewWaName(e.target.value)}
                    placeholder="Nome cliente"
                    className="mt-1 w-full rounded-lg border border-[rgba(205,154,79,0.3)] bg-[#211810] p-2 text-sm text-[#f7ecd0]"
                  />
                </label>

                <label className="block">
                  <span className="text-xs uppercase tracking-wider text-white/50">Messaggio iniziale</span>
                  <textarea
                    rows={3}
                    value={newWaMsg}
                    onChange={(e) => setNewWaMsg(e.target.value)}
                    placeholder="Scrivi un messaggio iniziale..."
                    className="mt-1 w-full rounded-lg border border-[rgba(205,154,79,0.3)] bg-[#211810] p-2 text-sm text-[#f7ecd0]"
                  />
                </label>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setChannelModal('pick')}
                    className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white/70 hover:bg-white/10"
                  >
                    Indietro
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const cleanTel = newWaPhone.replace(/[^\d+]/g, '');
                      if (!cleanTel || cleanTel.length < 8) {
                        say('Inserisci un numero di telefono valido.', true);
                        return;
                      }
                      const nomeFinal = newWaName.trim() || 'Cliente WhatsApp';
                      const msgFinal = newWaMsg.trim() || 'Conversazione WhatsApp avviata';
                      const rif = 'wa_' + cleanTel.replace(/\+/g, '');

                      setCasella((prev) => {
                        const exists = prev.find((x) => x.rif === rif);
                        if (exists) {
                          return prev.map((x) => x.rif === rif ? { ...x, messaggio: msgFinal, quando: new Date().toISOString() } : x);
                        }
                        const newItem: CasellaItem = {
                          tipo: 'chat',
                          rif,
                          nome: nomeFinal,
                          contatto: cleanTel,
                          messaggio: msgFinal,
                          quando: new Date().toISOString(),
                          nuovo: false,
                          stato: 'aperta',
                          assegnato: null,
                          contatto_id: null,
                          cartella: null,
                        };
                        return [newItem, ...prev];
                      });

                      setCasellaPick(rif);
                      setChannelModal(null);
                      say(`Conversazione con ${nomeFinal} pronta su Eliseo.`);
                    }}
                    className="rounded-lg bg-[#cd9a4f] px-4 py-2 text-sm font-bold text-black hover:bg-[#dfb26e]"
                  >
                    Avvia chat WhatsApp
                  </button>
                </div>
              </div>
            )}

            {channelModal === 'email' && (
              <div className="space-y-4 pt-4">
                <label className="block">
                  <span className="text-xs uppercase tracking-wider text-white/50">Contatto salvato</span>
                  <select
                    className="mt-1 w-full rounded-lg border border-[rgba(205,154,79,0.3)] bg-[#211810] p-2 text-sm text-[#f7ecd0]"
                    onChange={(e) => {
                      const f = contatti.find((c) => c.email === e.target.value);
                      if (f) {
                        setNewMailTo(f.email || '');
                        setNewMailName(f.nome || '');
                      }
                    }}
                  >
                    <option value="">— Inserisci nuova email —</option>
                    {contatti.filter((c) => c.email).map((c) => (
                      <option key={c.id} value={c.email || ''}>{c.nome} ({c.email})</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs uppercase tracking-wider text-white/50">Indirizzo email *</span>
                  <input
                    type="email"
                    value={newMailTo}
                    onChange={(e) => setNewMailTo(e.target.value)}
                    placeholder="cliente@email.it"
                    className="mt-1 w-full rounded-lg border border-[rgba(205,154,79,0.3)] bg-[#211810] p-2 text-sm text-[#f7ecd0]"
                  />
                </label>

                <label className="block">
                  <span className="text-xs uppercase tracking-wider text-white/50">Oggetto</span>
                  <input
                    type="text"
                    value={newMailSubject}
                    onChange={(e) => setNewMailSubject(e.target.value)}
                    placeholder="Oggetto dell'email"
                    className="mt-1 w-full rounded-lg border border-[rgba(205,154,79,0.3)] bg-[#211810] p-2 text-sm text-[#f7ecd0]"
                  />
                </label>

                <label className="block">
                  <span className="text-xs uppercase tracking-wider text-white/50">Messaggio</span>
                  <textarea
                    rows={4}
                    value={newMailBody}
                    onChange={(e) => setNewMailBody(e.target.value)}
                    placeholder="Scrivi il testo..."
                    className="mt-1 w-full rounded-lg border border-[rgba(205,154,79,0.3)] bg-[#211810] p-2 text-sm text-[#f7ecd0]"
                  />
                </label>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setChannelModal('pick')}
                    className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white/70 hover:bg-white/10"
                  >
                    Indietro
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!newMailTo || !newMailTo.includes('@')) {
                        say('Inserisci un indirizzo email valido.', true);
                        return;
                      }
                      const mailto = `mailto:${encodeURIComponent(newMailTo)}?subject=${encodeURIComponent(newMailSubject || 'Comunicazione da Barberia Garofalo')}&body=${encodeURIComponent(newMailBody)}`;
                      window.open(mailto, '_blank');
                      setChannelModal(null);
                      say('Email preparata.');
                    }}
                    className="rounded-lg bg-[#cd9a4f] px-4 py-2 text-sm font-bold text-black hover:bg-[#dfb26e]"
                  >
                    Prepara email
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODALE NUOVO / MODIFICA CONTATTO */}
      {isContactModalOpen && editingContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-[rgba(205,154,79,0.25)] bg-[#17110b] p-6 shadow-2xl text-[#f7ecd0]">
            <div className="flex items-center justify-between border-b border-[rgba(205,154,79,0.15)] pb-3">
              <h3 className="text-lg font-bold">
                {editingContact.id ? `Modifica: ${editingContact.nome}` : 'Nuovo contatto'}
              </h3>
              <button
                type="button"
                onClick={() => setIsContactModalOpen(false)}
                className="text-white/40 hover:text-white transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="el-form mt-4">
              <div className="el-grid">
                <div className="field">
                  <span>Nome *</span>
                  <input
                    type="text"
                    value={editingContact.nome || ''}
                    onChange={(e) => setEditingContact({ ...editingContact, nome: e.target.value })}
                  />
                  {contactFormErrors.nome && (
                    <span className="field__error">{contactFormErrors.nome}</span>
                  )}
                </div>

                <div className="field">
                  <span>Telefono</span>
                  <input
                    type="tel"
                    value={editingContact.telefono || ''}
                    onChange={(e) =>
                      setEditingContact({ ...editingContact, telefono: e.target.value })
                    }
                  />
                  {contactFormErrors.telefono && (
                    <span className="field__error">{contactFormErrors.telefono}</span>
                  )}
                </div>
              </div>

              <div className="el-grid">
                <div className="field">
                  <span>Email</span>
                  <input
                    type="email"
                    value={editingContact.email || ''}
                    onChange={(e) => setEditingContact({ ...editingContact, email: e.target.value })}
                  />
                </div>

                <div className="field">
                  <span>Fonte</span>
                  <select
                    value={editingContact.fonte || 'negozio'}
                    onChange={(e) =>
                      setEditingContact({ ...editingContact, fonte: e.target.value as Fonte })
                    }
                  >
                    {FONTI.map(([k, t]) => (
                      <option key={k} value={k}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="el-grid">
                <div className="field">
                  <span>Fase</span>
                  <select
                    value={editingContact.fase || 'nuovo'}
                    onChange={(e) =>
                      setEditingContact({ ...editingContact, fase: e.target.value as Fase })
                    }
                  >
                    {FASI.map(([k, t]) => (
                      <option key={k} value={k}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <span>Barbiere preferito</span>
                  <select
                    value={editingContact.barbiere || ''}
                    onChange={(e) =>
                      setEditingContact({ ...editingContact, barbiere: e.target.value })
                    }
                  >
                    <option value="">—</option>
                    {team.map((b) => (
                      <option key={b.id} value={b.nome}>
                        {b.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <label className="el-consent">
                <input
                  type="checkbox"
                  checked={Boolean(editingContact.consenso_marketing)}
                  onChange={(e) =>
                    setEditingContact({
                      ...editingContact,
                      consenso_marketing: e.target.checked,
                    })
                  }
                />
                <span>Ha dato il consenso a ricevere novità e comunicazioni (marketing)</span>
              </label>

              <div className="field">
                <span>Etichette (separate da virgola)</span>
                <input
                  type="text"
                  placeholder="es. sposo, studente, barba"
                  value={(editingContact.etichette || []).join(', ')}
                  onChange={(e) =>
                    setEditingContact({
                      ...editingContact,
                      etichette: cleanTags(e.target.value),
                    })
                  }
                />
              </div>

              <div className="field">
                <span>Note</span>
                <textarea
                  rows={3}
                  value={editingContact.note || ''}
                  onChange={(e) => setEditingContact({ ...editingContact, note: e.target.value })}
                />
              </div>

              <div className="actions mt-3 flex justify-between">
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn btn--primary"
                    disabled={isPending}
                    onClick={handleSaveContact}
                  >
                    Salva contatto
                  </button>
                  <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={() => setIsContactModalOpen(false)}
                  >
                    Annulla
                  </button>
                </div>

                {editingContact.id && (
                  <button
                    type="button"
                    className="btn btn--danger"
                    onClick={() => handleDeleteContact(editingContact.id!)}
                  >
                    <Trash2 size={15} /> Elimina
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALE IMPORTA CSV */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-[rgba(205,154,79,0.25)] bg-[#17110b] p-6 shadow-2xl text-[#f7ecd0]">
            <div className="flex items-center justify-between border-b border-[rgba(205,154,79,0.15)] pb-3">
              <h3 className="text-lg font-bold">Importa contatti da CSV</h3>
              <button
                type="button"
                onClick={() => setIsCsvModalOpen(false)}
                className="text-white/40 hover:text-white transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="el-form mt-4">
              <p className="pcard__note">
                Carica un file CSV con colonne: Nome, Telefono, Email. I duplicati già presenti non verranno sovrascritti.
              </p>

              <div className="field">
                <span>File CSV</span>
                <input type="file" accept=".csv,text/csv" onChange={handleCsvChange} />
              </div>

              <div className="el-grid">
                <div className="field">
                  <span>Da dove arrivano (fonte)</span>
                  <select
                    value={csvFonte}
                    onChange={(e) => setCsvFonte(e.target.value as Fonte)}
                  >
                    {FONTI.map(([k, t]) => (
                      <option key={k} value={k}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <span>Etichetta da assegnare</span>
                  <input
                    type="text"
                    value={csvTag}
                    onChange={(e) => setCsvTag(e.target.value)}
                  />
                </div>
              </div>

              {csvPlan && (
                <div className="rounded-xl bg-[#100b07] border border-[rgba(205,154,79,0.2)] p-4 text-sm">
                  {csvPlan.errore ? (
                    <p className="text-red-400 font-semibold">{csvPlan.errore}</p>
                  ) : (
                    <div>
                      <p className="font-semibold text-green-400">
                        {csvPlan.nuovi.length} contatti nuovi pronti per l’importazione
                      </p>
                      <p className="text-white/50 text-xs mt-1">
                        {csvPlan.doppi} già presenti (non toccati) · {csvPlan.scartati} righe non valide.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="actions mt-3">
                <button
                  type="button"
                  className="btn btn--primary"
                  disabled={!csvPlan || !csvPlan.nuovi.length || isPending}
                  onClick={handleImportCsv}
                >
                  <Upload size={15} /> Conferma importazione
                </button>
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => setIsCsvModalOpen(false)}
                >
                  Chiudi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
