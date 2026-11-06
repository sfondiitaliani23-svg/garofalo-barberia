'use client';

import React, { useState, useMemo, useTransition } from 'react';
import {
  MessageSquare,
  Users,
  Calendar,
  BarChart3,
  Settings,
  Search,
  Plus,
  Copy,
  Trash2,
  ExternalLink,
  MessageCircle,
  Mail,
  Upload,
  UserPlus,
  CheckCircle2,
  X,
  Megaphone,
  FileText,
} from 'lucide-react';
import './eliseo.css';
import {
  FASI,
  FONTI,
  CATEGORIE,
  PAGES,
  filterContacts,
  summary,
  allTags,
  cleanContact,
  cleanTags,
  parseCsv,
  mapImport,
  fillTemplate,
  cleanTemplate,
  type Contatto,
  type Fase,
  type Fonte,
  type Categoria,
  type Modello,
  type Campagna,
  type CasellaItem,
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
} from '@/lib/actions/eliseo';

type RailTab = 'casella' | 'contatti' | 'prenota' | 'analisi' | 'settings';
type ContattiSubTab = 'elenco' | 'campagne' | 'modelli';

interface AdminEliseoProps {
  initialContatti: Contatto[];
  initialModelli: Modello[];
  initialCampagne: Campagna[];
  initialCasella: CasellaItem[];
  team: Array<{ id: string; nome: string }>;
  tester: boolean;
  prenotaUrl: string;
}

export function AdminEliseo({
  initialContatti,
  initialModelli,
  initialCampagne,
  initialCasella,
  team,
  tester,
  prenotaUrl,
}: AdminEliseoProps) {
  const [contatti, setContatti] = useState<Contatto[]>(initialContatti);
  const [modelli, setModelli] = useState<Modello[]>(initialModelli);
  const [campagne, setCampagne] = useState<Campagna[]>(initialCampagne);
  const [casella, setCasella] = useState<CasellaItem[]>(initialCasella);

  // Navigazione
  const [railTab, setRailTab] = useState<RailTab>('casella');
  const [contattiTab, setContattiTab] = useState<ContattiSubTab>('elenco');
  const [viewMode, setViewMode] = useState<'lista' | 'kanban'>('lista');

  // Filtri Casella
  const [casellaTeam, setCasellaTeam] = useState<string>('');
  const [casellaStato, setCasellaStato] = useState<'tutte' | 'aperte' | 'nuove' | 'chiuse'>('tutte');
  const [casellaSearch, setCasellaSearch] = useState('');
  const [selectedCasellaKey, setSelectedCasellaKey] = useState<string | null>(null);
  const [selectedModelloForReply, setSelectedModelloForReply] = useState<string>('');

  // Filtri Contatti
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFase, setFilterFase] = useState<string>('');
  const [filterFonte, setFilterFonte] = useState<string>('');
  const [filterTag, setFilterTag] = useState<string>('');

  // Modale Contatto
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Partial<Contatto> | null>(null);
  const [contactFormErrors, setContactFormErrors] = useState<Record<string, string>>({});

  // Modale Import CSV
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [csvFonte, setCsvFonte] = useState<Fonte>('whatsapp');
  const [csvTag, setCsvTag] = useState('import');
  const [csvPlan, setCsvPlan] = useState<ReturnType<typeof mapImport> | null>(null);

  // Campagna Form
  const [campagnaNome, setCampagnaNome] = useState('');
  const [campagnaTitolo, setCampagnaTitolo] = useState('');
  const [campagnaTesto, setCampagnaTesto] = useState('');
  const [campagnaUrl, setCampagnaUrl] = useState('/prenota');
  const [campagnaFasi, setCampagnaFasi] = useState<string[]>(['cliente']);
  const [campagnaMsg, setCampagnaMsg] = useState('');

  // Nuovo Modello Form
  const [nuovoModelloNome, setNuovoModelloNome] = useState('');
  const [nuovoModelloCat, setNuovoModelloCat] = useState<Categoria>('altro');
  const [nuovoModelloTesto, setNuovoModelloTesto] = useState('Ciao {nome}, ');

  // Status & Transitions
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [statusBad, setStatusBad] = useState<boolean>(false);
  const [isPending, startTransition] = useTransition();

  const say = (t: string, bad = false) => {
    setStatusMsg(t);
    setStatusBad(bad);
    setTimeout(() => {
      setStatusMsg('');
    }, 6000);
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('it-IT', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  // Helper avatar tono colore
  const tono = (nome: string) =>
    Array.from(String(nome || '?')).reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 5;

  // Filtraggio contatti
  const tagsList = useMemo(() => allTags(contatti), [contatti]);
  const stats = useMemo(() => summary(contatti), [contatti]);

  const contattiFiltrati = useMemo(() => {
    return filterContacts(contatti, {
      q: searchQuery,
      fase: filterFase,
      fonte: filterFonte,
      etichetta: filterTag,
    });
  }, [contatti, searchQuery, filterFase, filterFonte, filterTag]);

  // Filtraggio Casella
  const casellaFiltrata = useMemo(() => {
    return casella.filter((item) => {
      if (casellaTeam === '__none' && item.assegnato) return false;
      if (casellaTeam && casellaTeam !== '__none' && item.assegnato !== casellaTeam) return false;

      if (casellaStato === 'nuove' && !item.nuovo) return false;
      if (casellaStato === 'aperte' && item.stato === 'chiusa') return false;
      if (casellaStato === 'chiuse' && item.stato !== 'chiusa') return false;

      if (casellaSearch) {
        const q = casellaSearch.toLowerCase();
        const matchName = item.nome.toLowerCase().includes(q);
        const matchMsg = item.messaggio?.toLowerCase().includes(q);
        if (!matchName && !matchMsg) return false;
      }
      return true;
    });
  }, [casella, casellaTeam, casellaStato, casellaSearch]);

  const selectedCasellaItem = useMemo(() => {
    if (!selectedCasellaKey) return casellaFiltrata[0] || null;
    return casella.find((x) => `${x.tipo}:${x.rif}` === selectedCasellaKey) || null;
  }, [casella, selectedCasellaKey, casellaFiltrata]);

  // Gestione Contatto
  const handleOpenContactModal = (c?: Contatto) => {
    if (tester) {
      say('Modalità tester: sola visualizzazione.', true);
      return;
    }
    setContactFormErrors({});
    if (c) {
      setEditingContact({ ...c });
    } else {
      setEditingContact({
        nome: '',
        email: '',
        telefono: '',
        fonte: 'negozio',
        fase: 'nuovo',
        barbiere: team[0]?.nome || '',
        consenso_marketing: false,
        note: '',
        etichette: [],
      });
    }
    setIsContactModalOpen(true);
  };

  const handleSaveContact = () => {
    if (!editingContact) return;
    const { row, ok, errors } = cleanContact(editingContact);
    if (!ok) {
      setContactFormErrors(errors);
      return;
    }

    startTransition(async () => {
      const res = await saveContattoAction({
        ...editingContact,
        ...row,
      });
      if (res.ok) {
        setContatti((prev) => {
          const idx = prev.findIndex((x) => x.id === res.contatto.id);
          if (idx >= 0) {
            const upd = [...prev];
            upd[idx] = res.contatto;
            return upd;
          }
          return [res.contatto, ...prev];
        });
        setIsContactModalOpen(false);
        say(`${res.contatto.nome} salvato con successo.`);
      } else {
        say(res.error, true);
      }
    });
  };

  const handleDeleteContact = (id: string) => {
    if (tester) return;
    startTransition(async () => {
      const res = await deleteContattoAction(id);
      if (res.ok) {
        setContatti((prev) => prev.filter((x) => x.id !== id));
        setIsContactModalOpen(false);
        say('Contatto eliminato.');
      } else {
        say(res.error || 'Errore durante l’eliminazione.', true);
      }
    });
  };

  const handleSetFase = (id: string, nuovaFase: Fase) => {
    if (tester) return;
    startTransition(async () => {
      const res = await setFaseContattoAction(id, nuovaFase);
      if (res.ok) {
        setContatti((prev) =>
          prev.map((c) => (c.id === id ? { ...c, fase: nuovaFase, aggiornato_il: new Date().toISOString() } : c))
        );
        say(`Fase aggiornata.`);
      } else {
        say(res.error || 'Errore.', true);
      }
    });
  };

  const handleCopyIscritti = () => {
    if (tester) return;
    startTransition(async () => {
      const res = await importaIscrittiAction();
      if (res.ok) {
        say(`${res.count} iscritti del sito copiati nei contatti.`);
      } else {
        say(res.error, true);
      }
    });
  };

  // Gestione CSV
  const handleCsvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = String(ev.target?.result || '');
      setCsvText(content);
      const parsed = parseCsv(content);
      const plan = mapImport(parsed, contatti, { fonte: csvFonte, etichetta: csvTag });
      setCsvPlan(plan);
    };
    reader.readAsText(file);
  };

  const handleImportCsv = () => {
    if (!csvPlan || !csvPlan.nuovi.length) return;
    startTransition(async () => {
      const res = await importaCsvAction(csvPlan.nuovi);
      if (res.ok) {
        say(`${res.count} contatti importati con successo.`);
        setIsCsvModalOpen(false);
        setCsvPlan(null);
        setCsvText('');
      } else {
        say(res.error, true);
      }
    });
  };

  // Gestione Casella Stato
  const handleUpdateCasella = (stato: 'aperta' | 'in_corso' | 'chiusa', assegnato: string | null) => {
    if (!selectedCasellaItem || tester) return;
    startTransition(async () => {
      const res = await saveCasellaStatoAction({
        tipo: selectedCasellaItem.tipo,
        rif: selectedCasellaItem.rif,
        stato,
        assegnato,
        contatto_id: selectedCasellaItem.contatto_id,
      });
      if (res.ok) {
        setCasella((prev) =>
          prev.map((it) =>
            it.tipo === selectedCasellaItem.tipo && it.rif === selectedCasellaItem.rif
              ? { ...it, stato, assegnato }
              : it
          )
        );
        say('Casella aggiornata.');
      } else {
        say(res.error || 'Errore.', true);
      }
    });
  };

  const handleAddCasellaToContacts = () => {
    if (!selectedCasellaItem || tester) return;
    const isEmail = selectedCasellaItem.contatto?.includes('@');
    const tel = !isEmail ? selectedCasellaItem.contatto : null;
    const mail = isEmail ? selectedCasellaItem.contatto : null;

    startTransition(async () => {
      const res = await saveContattoAction({
        nome: selectedCasellaItem.nome,
        email: mail,
        telefono: tel,
        fonte: 'sito',
        fase: 'nuovo',
        note: `Dal modulo di contatto: ${selectedCasellaItem.motivo || ''}`,
      });
      if (res.ok) {
        setContatti((prev) => [res.contatto, ...prev]);
        await saveCasellaStatoAction({
          tipo: selectedCasellaItem.tipo,
          rif: selectedCasellaItem.rif,
          stato: selectedCasellaItem.stato,
          assegnato: selectedCasellaItem.assegnato,
          contatto_id: res.contatto.id,
        });
        setCasella((prev) =>
          prev.map((it) =>
            it.tipo === selectedCasellaItem.tipo && it.rif === selectedCasellaItem.rif
              ? { ...it, contatto_id: res.contatto.id }
              : it
          )
        );
        say(`${res.contatto.nome} aggiunto alla rubrica contatti.`);
      } else {
        say(res.error, true);
      }
    });
  };

  // Gestione Campagne
  const matchingCampagnaCount = useMemo(() => {
    return contatti.filter(
      (c) => c.consenso_marketing && c.user_id && campagnaFasi.includes(c.fase)
    ).length;
  }, [contatti, campagnaFasi]);

  const handleSendCampagna = () => {
    if (!campagnaNome.trim() || !campagnaTitolo.trim() || !campagnaTesto.trim()) {
      setCampagnaMsg('Compila tutti i campi.');
      return;
    }
    if (!campagnaFasi.length) {
      setCampagnaMsg('Seleziona almeno una fase.');
      return;
    }

    startTransition(async () => {
      const res = await sendCampagnaAction({
        nome: campagnaNome,
        titolo: campagnaTitolo,
        testo: campagnaTesto,
        url: campagnaUrl,
        fasi: campagnaFasi,
      });

      if (res.ok) {
        say(`Campagna inviata: ${res.inviati} avvisi inviati.`);
        setCampagne((prev) => [
          {
            id: `c-${Date.now()}`,
            nome: campagnaNome,
            titolo: campagnaTitolo,
            testo: campagnaTesto,
            url: campagnaUrl,
            fasi: campagnaFasi,
            destinatari: matchingCampagnaCount,
            inviati: res.inviati,
            falliti: res.falliti,
            creato_il: new Date().toISOString(),
          },
          ...prev,
        ]);
        setCampagnaNome('');
        setCampagnaTitolo('');
        setCampagnaTesto('');
      } else {
        setCampagnaMsg(res.error);
      }
    });
  };

  // Gestione Modelli
  const handleSaveNuovoModello = () => {
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
        say(res.error || 'Errore.', true);
      }
    });
  };

  return (
    <div className={`el-app ${railTab === 'contatti' ? 'has-sub' : ''}`}>
      {/* 1. Icon Rail (Colonna Nera) */}
      <nav className="el-rail" aria-label="Eliseo">
        <div className="el-rail__nav">
          <span className="el-mark" aria-hidden="true">
            E
          </span>

          <button
            type="button"
            className="el-rail__btn"
            aria-label="Casella"
            title="Conversazioni"
            aria-pressed={railTab === 'casella'}
            onClick={() => setRailTab('casella')}
          >
            <MessageSquare />
          </button>

          <button
            type="button"
            className="el-rail__btn"
            aria-label="Contatti"
            title="Contatti e Campagne"
            aria-pressed={railTab === 'contatti'}
            onClick={() => setRailTab('contatti')}
          >
            <Users />
          </button>

          <button
            type="button"
            className="el-rail__btn"
            aria-label="Prenotazioni"
            title="Prenotazioni"
            aria-pressed={railTab === 'prenota'}
            onClick={() => setRailTab('prenota')}
          >
            <Calendar />
          </button>

          <button
            type="button"
            className="el-rail__btn"
            aria-label="Analisi"
            title="Analisi KPI"
            aria-pressed={railTab === 'analisi'}
            onClick={() => setRailTab('analisi')}
          >
            <BarChart3 />
          </button>
        </div>

        <button
          type="button"
          className="el-rail__btn"
          aria-label="Impostazioni"
          title="Impostazioni"
          aria-pressed={railTab === 'settings'}
          onClick={() => setRailTab('settings')}
        >
          <Settings />
        </button>
      </nav>

      {/* 2. Sub-Sidebar (per Contatti) */}
      {railTab === 'contatti' && (
        <aside className="el-side">
          <p className="el-side__title">Rubrica & CRM</p>
          <div className="el-navs" role="tablist">
            <button
              type="button"
              className="el-nav"
              role="tab"
              aria-selected={contattiTab === 'elenco'}
              onClick={() => setContattiTab('elenco')}
            >
              <Users size={16} />
              <span>Contatti</span>
            </button>

            <button
              type="button"
              className="el-nav"
              role="tab"
              aria-selected={contattiTab === 'campagne'}
              onClick={() => setContattiTab('campagne')}
            >
              <Megaphone size={16} />
              <span>Campagne</span>
            </button>

            <button
              type="button"
              className="el-nav"
              role="tab"
              aria-selected={contattiTab === 'modelli'}
              onClick={() => setContattiTab('modelli')}
            >
              <FileText size={16} />
              <span>Modelli</span>
            </button>
          </div>

          {contattiTab === 'elenco' && (
            <div className="mt-4">
              <p className="el-group">Cartelle</p>
              <div className="el-folders">
                <button
                  type="button"
                  className="el-folder"
                  aria-pressed={!filterFonte && !filterTag}
                  onClick={() => {
                    setFilterFonte('');
                    setFilterTag('');
                  }}
                >
                  <span>Tutti</span>
                  <b>{contatti.length}</b>
                </button>

                {FONTI.map(([fId, fName]) => {
                  const count = contatti.filter((c) => c.fonte === fId).length;
                  return (
                    <button
                      key={fId}
                      type="button"
                      className="el-folder"
                      aria-pressed={filterFonte === fId}
                      onClick={() => {
                        setFilterFonte(fId);
                        setFilterTag('');
                      }}
                    >
                      <span>{fName}</span>
                      <b>{count}</b>
                    </button>
                  );
                })}
              </div>

              {tagsList.length > 0 && (
                <div className="mt-3">
                  <p className="el-group">Etichette</p>
                  <div className="el-folders">
                    {tagsList.map((tag) => {
                      const count = contatti.filter((c) => (c.etichette || []).includes(tag)).length;
                      return (
                        <button
                          key={tag}
                          type="button"
                          className="el-folder"
                          aria-pressed={filterTag === tag}
                          onClick={() => {
                            setFilterTag(tag);
                            setFilterFonte('');
                          }}
                        >
                          <span>{tag}</span>
                          <b>{count}</b>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </aside>
      )}

      {/* 3. Stage & Body */}
      <div className="el-stage">
        <div className="el-body">
          {/* VISTA CASELLA */}
          {railTab === 'casella' && (
            <div className="el-conv">
              {/* Colonna Filtri Casella */}
              <div className="el-conv__side">
                <p className="el-group">Team</p>
                <div className="el-folders">
                  <button
                    type="button"
                    className="el-folder"
                    aria-pressed={casellaTeam === ''}
                    onClick={() => setCasellaTeam('')}
                  >
                    <span>Tutto il team</span>
                    <b>{casella.length}</b>
                  </button>

                  <button
                    type="button"
                    className="el-folder"
                    aria-pressed={casellaTeam === '__none'}
                    onClick={() => setCasellaTeam('__none')}
                  >
                    <span>Non assegnate</span>
                    <b>{casella.filter((x) => !x.assegnato).length}</b>
                  </button>

                  {team.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="el-folder"
                      aria-pressed={casellaTeam === p.nome}
                      onClick={() => setCasellaTeam(p.nome)}
                    >
                      <span>{p.nome}</span>
                      <b>{casella.filter((x) => x.assegnato === p.nome).length}</b>
                    </button>
                  ))}
                </div>

                <p className="el-group mt-3">Stati</p>
                <div className="el-folders">
                  {[
                    ['tutte', 'Tutte', casella.length],
                    ['aperte', 'Aperte', casella.filter((x) => x.stato !== 'chiusa').length],
                    ['nuove', 'Da leggere', casella.filter((x) => x.nuovo).length],
                    ['chiuse', 'Chiuse', casella.filter((x) => x.stato === 'chiusa').length],
                  ].map(([k, t, n]) => (
                    <button
                      key={k as string}
                      type="button"
                      className="el-folder"
                      aria-pressed={casellaStato === k}
                      onClick={() => setCasellaStato(k as typeof casellaStato)}
                    >
                      <span>{t as string}</span>
                      <b>{n as number}</b>
                    </button>
                  ))}
                </div>
              </div>

              {/* Colonna Elenco Conversazioni */}
              <div className="el-conv__list">
                <div className="el-conv__top">
                  <strong>Conversazioni</strong>
                  <span className="el-count">{casellaFiltrata.length}</span>
                </div>
                <div className="el-conv__search">
                  <input
                    type="search"
                    className="el-search"
                    placeholder="Cerca nome o testo"
                    value={casellaSearch}
                    onChange={(e) => setCasellaSearch(e.target.value)}
                  />
                </div>
                <div className="el-conv__rows">
                  {casellaFiltrata.length === 0 ? (
                    <p className="pempty">La casella è vuota.</p>
                  ) : (
                    casellaFiltrata.map((x) => {
                      const key = `${x.tipo}:${x.rif}`;
                      const isSel = selectedCasellaItem ? `${selectedCasellaItem.tipo}:${selectedCasellaItem.rif}` === key : false;
                      return (
                        <button
                          key={key}
                          type="button"
                          className={`el-row ${isSel ? 'is-on' : ''}`}
                          onClick={() => setSelectedCasellaKey(key)}
                        >
                          <span className="el-av" data-tone={String(tono(x.nome))}>
                            {(x.nome || '?').charAt(0).toUpperCase()}
                          </span>
                          <span className="el-row__body">
                            <span className="el-row__top">
                              <strong>{x.nome || 'Senza nome'}</strong>
                              <small>{formatDate(x.quando)}</small>
                            </span>
                            <span className="el-row__prev">
                              {x.messaggio ? x.messaggio.slice(0, 70) : 'Nuova richiesta'}
                            </span>
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Colonna Dettaglio Conversazione */}
              <div className="el-conv__detail">
                {selectedCasellaItem ? (
                  <>
                    <header className="el-detail__head">
                      <span className="el-av" data-tone={String(tono(selectedCasellaItem.nome))}>
                        {(selectedCasellaItem.nome || '?').charAt(0).toUpperCase()}
                      </span>
                      <div>
                        <h2>{selectedCasellaItem.nome || 'Senza nome'}</h2>
                        <p>
                          Modulo di contatto · {formatDate(selectedCasellaItem.quando)}
                          {selectedCasellaItem.contatto ? ` · ${selectedCasellaItem.contatto}` : ''}
                        </p>
                      </div>
                    </header>

                    {selectedCasellaItem.nuovo && <span className="el-dot">Nuova</span>}

                    {selectedCasellaItem.messaggio && (
                      <p className="el-detail__text">{selectedCasellaItem.messaggio}</p>
                    )}

                    <div className="el-detail__ctrl">
                      <label className="field">
                        <span>Stato</span>
                        <select
                          className="el-fase"
                          value={selectedCasellaItem.stato}
                          onChange={(e) =>
                            handleUpdateCasella(
                              e.target.value as 'aperta' | 'in_corso' | 'chiusa',
                              selectedCasellaItem.assegnato
                            )
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
                          className="el-fase"
                          value={selectedCasellaItem.assegnato || ''}
                          onChange={(e) =>
                            handleUpdateCasella(
                              selectedCasellaItem.stato,
                              e.target.value || null
                            )
                          }
                        >
                          <option value="">Non assegnata</option>
                          {team.map((b) => (
                            <option key={b.id} value={b.nome}>
                              {b.nome}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="el-detail__act">
                      {selectedCasellaItem.contatto && (
                        <>
                          {modelli.length > 0 && (
                            <select
                              className="el-fase"
                              value={selectedModelloForReply}
                              onChange={(e) => setSelectedModelloForReply(e.target.value)}
                            >
                              <option value="">Scegli modello risposta</option>
                              {modelli.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.nome}
                                </option>
                              ))}
                            </select>
                          )}

                          {(() => {
                            const mod = modelli.find((y) => y.id === selectedModelloForReply);
                            const text = mod
                              ? fillTemplate(mod.testo, { nome: selectedCasellaItem.nome }, prenotaUrl)
                              : '';
                            const cleanTel = selectedCasellaItem.contatto.replace(/\D/g, '');
                            const tel = cleanTel.startsWith('39') ? cleanTel : `39${cleanTel}`;
                            const isEmail = selectedCasellaItem.contatto.includes('@');

                            if (isEmail) {
                              return (
                                <a
                                  href={`mailto:${selectedCasellaItem.contatto}${text ? `?body=${encodeURIComponent(text)}` : ''}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn--secondary"
                                >
                                  <Mail size={15} /> Rispondi per email
                                </a>
                              );
                            } else {
                              return (
                                <a
                                  href={`https://wa.me/${tel}${text ? `?text=${encodeURIComponent(text)}` : ''}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn--secondary"
                                >
                                  <MessageCircle size={15} /> Rispondi su WhatsApp
                                </a>
                              );
                            }
                          })()}
                        </>
                      )}

                      {!selectedCasellaItem.contatto_id && (
                        <button
                          type="button"
                          className="btn btn--secondary"
                          onClick={handleAddCasellaToContacts}
                        >
                          <UserPlus size={15} /> Aggiungi ai contatti
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="pempty">Seleziona una conversazione.</p>
                )}
              </div>
            </div>
          )}

          {/* VISTA CONTATTI (ELENCO O KANBAN) */}
          {railTab === 'contatti' && contattiTab === 'elenco' && (
            <div>
              <header className="el-pagehead">
                <h2>Contatti</h2>
                <div className="el-pagehead__act">
                  <div className="el-switch" role="group" aria-label="Vista contatti">
                    <button
                      type="button"
                      aria-pressed={viewMode === 'lista'}
                      onClick={() => setViewMode('lista')}
                    >
                      Lista
                    </button>
                    <button
                      type="button"
                      aria-pressed={viewMode === 'kanban'}
                      onClick={() => setViewMode('kanban')}
                    >
                      Kanban
                    </button>
                  </div>
                  <span className="el-count">{contattiFiltrati.length} contatti</span>
                </div>
              </header>

              <div className="el-book">
                <div className="el-book__main">
                  <div className="el-tools">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="search"
                        className="el-search"
                        placeholder="Cerca nome, email o telefono"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />

                      <select
                        className="el-fase"
                        value={filterFase}
                        onChange={(e) => setFilterFase(e.target.value)}
                      >
                        <option value="">Tutte le fasi</option>
                        {FASI.map(([k, t]) => (
                          <option key={k} value={k}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="el-tools__act">
                      <button
                        type="button"
                        className="btn btn--primary"
                        onClick={() => handleOpenContactModal()}
                      >
                        <Plus size={15} /> Nuovo contatto
                      </button>

                      <button
                        type="button"
                        className="btn btn--secondary"
                        onClick={handleCopyIscritti}
                      >
                        <UserPlus size={15} /> Copia iscritti al sito
                      </button>

                      <button
                        type="button"
                        className="btn btn--secondary"
                        onClick={() => setIsCsvModalOpen(true)}
                      >
                        <Upload size={15} /> Importa da CSV
                      </button>
                    </div>
                  </div>

                  {/* VISTA TABELLA */}
                  {viewMode === 'lista' && (
                    <div className="table-wrap">
                      {contattiFiltrati.length === 0 ? (
                        <p className="pempty">Nessun contatto trovato con questi filtri.</p>
                      ) : (
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
                            {contattiFiltrati.map((c) => (
                              <tr key={c.id}>
                                <td>
                                  <button
                                    type="button"
                                    className="link-button"
                                    onClick={() => handleOpenContactModal(c)}
                                  >
                                    {c.nome}
                                  </button>
                                  {c.etichette && c.etichette.length > 0 && (
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
                                    className="el-fase"
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
                                  <span
                                    className={`pchip ${c.consenso_marketing ? 'pchip--ok' : 'pchip--wait'}`}
                                  >
                                    {c.consenso_marketing ? 'Sì' : 'No'}
                                  </span>
                                </td>
                                <td>{formatDate(c.aggiornato_il)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}

                  {/* VISTA KANBAN */}
                  {viewMode === 'kanban' && (
                    <div className="el-cols">
                      {FASI.map(([fId, fName]) => {
                        const items = contattiFiltrati.filter((c) => c.fase === fId);
                        return (
                          <section key={fId} className="el-col">
                            <header className="el-col__head">
                              <span>{fName}</span>
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
                                      className="link-button"
                                      onClick={() => handleOpenContactModal(c)}
                                    >
                                      {c.nome}
                                    </button>
                                    <p className="el-card__meta">
                                      {c.fonte} {c.barbiere ? `· ${c.barbiere}` : ''}
                                    </p>
                                    {c.etichette && c.etichette.length > 0 && (
                                      <div className="el-tags">
                                        {c.etichette.map((t) => (
                                          <span key={t} className="el-tag">
                                            {t}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                    <select
                                      className="el-move"
                                      value={c.fase}
                                      onChange={(e) => handleSetFase(c.id, e.target.value as Fase)}
                                    >
                                      {FASI.map(([k, t]) => (
                                        <option key={k} value={k}>
                                          Sposta in {t}
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
                </div>
              </div>
            </div>
          )}

          {/* VISTA CAMPAGNE */}
          {railTab === 'contatti' && contattiTab === 'campagne' && (
            <div>
              <header className="el-pagehead">
                <h2>Campagne</h2>
              </header>

              <div className="pcard">
                <h3 className="pcard__title">Nuova campagna push</h3>
                <p className="pcard__note">
                  Arriva come avviso sul telefono (gratis). Solo ai contatti che hanno dato il
                  consenso, hanno un account sul sito e hanno attivato le notifiche.
                </p>

                <div className="el-form">
                  <div className="field">
                    <span>Nome della campagna</span>
                    <input
                      type="text"
                      maxLength={80}
                      placeholder="Es. Ritorno clienti d'autunno"
                      value={campagnaNome}
                      onChange={(e) => setCampagnaNome(e.target.value)}
                    />
                  </div>

                  <div className="field">
                    <span>A chi (fasi)</span>
                    <div className="flex flex-wrap gap-4 mt-1">
                      {FASI.map(([k, t]) => (
                        <label key={k} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={campagnaFasi.includes(k)}
                            onChange={(e) => {
                              if (e.target.checked) setCampagnaFasi([...campagnaFasi, k]);
                              else setCampagnaFasi(campagnaFasi.filter((x) => x !== k));
                            }}
                          />
                          <span>{t}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="field">
                    <span>Titolo avviso</span>
                    <input
                      type="text"
                      maxLength={60}
                      placeholder="Titolo avviso (max 60 car.)"
                      value={campagnaTitolo}
                      onChange={(e) => setCampagnaTitolo(e.target.value)}
                    />
                  </div>

                  <div className="field">
                    <span>Testo avviso</span>
                    <textarea
                      maxLength={160}
                      rows={3}
                      placeholder="Testo dell'avviso (max 160 car.)"
                      value={campagnaTesto}
                      onChange={(e) => setCampagnaTesto(e.target.value)}
                    />
                  </div>

                  <div className="field">
                    <span>Pagina che si apre</span>
                    <select
                      value={campagnaUrl}
                      onChange={(e) => setCampagnaUrl(e.target.value)}
                    >
                      {PAGES.map(([u, l]) => (
                        <option key={u} value={u}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </div>

                  <p className="pcard__note">
                    {matchingCampagnaCount} contatti con consenso e account pronti a ricevere la campagna.
                  </p>

                  {campagnaMsg && <p className="field__error">{campagnaMsg}</p>}

                  <div className="actions">
                    <button
                      type="button"
                      className="btn btn--primary"
                      disabled={isPending || matchingCampagnaCount === 0}
                      onClick={handleSendCampagna}
                    >
                      <Megaphone size={15} /> Invia la campagna
                    </button>
                  </div>
                </div>
              </div>

              {/* Storico Campagne */}
              <div className="pcard">
                <h3 className="pcard__title">Campagne inviate</h3>
                {campagne.length === 0 ? (
                  <p className="pempty">Nessuna campagna inviata finora.</p>
                ) : (
                  <div className="table-wrap">
                    <table className="ptable">
                      <thead>
                        <tr>
                          <th>Nome</th>
                          <th>Data</th>
                          <th>Fasi</th>
                          <th>Inviati</th>
                          <th>Non consegnati</th>
                        </tr>
                      </thead>
                      <tbody>
                        {campagne.map((cp) => (
                          <tr key={cp.id}>
                            <td>{cp.nome}</td>
                            <td>{formatDate(cp.creato_il)}</td>
                            <td>{cp.fasi.join(', ') || '—'}</td>
                            <td>{cp.inviati}</td>
                            <td>{cp.falliti}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VISTA MODELLI */}
          {railTab === 'contatti' && contattiTab === 'modelli' && (
            <div>
              <header className="el-pagehead">
                <h2>Modelli di messaggio</h2>
              </header>

              <div className="pcard">
                <p className="pcard__note">
                  Testi pronti, come le FAQ-modello di Keplero. Nella casella scegli un modello e si
                  apre WhatsApp o l’email con il testo già scritto.
                </p>

                <div className="el-models">
                  {CATEGORIE.map(([catId, catName]) => {
                    const group = modelli.filter((m) => m.categoria === catId);
                    if (!group.length) return null;
                    return (
                      <div key={catId}>
                        <h4 className="el-models__cat">{catName}</h4>
                        {group.map((m) => (
                          <details key={m.id} className="el-model mb-2">
                            <summary>
                              <strong>{m.nome}</strong>
                              <span>{m.testo.slice(0, 90)}...</span>
                            </summary>
                            <form
                              className="el-form"
                              onSubmit={(e) => {
                                e.preventDefault();
                              }}
                            >
                              <div className="field">
                                <span>Testo</span>
                                <textarea
                                  defaultValue={m.testo}
                                  rows={4}
                                  id={`mod-${m.id}`}
                                />
                              </div>
                              <p className="pcard__note">
                                Anteprima:{' '}
                                {fillTemplate(
                                  m.testo,
                                  { nome: 'Luca Rossi', barbiere: 'Luigi Garofalo' },
                                  prenotaUrl
                                )}
                              </p>
                              <div className="actions">
                                <button
                                  type="button"
                                  className="btn btn--secondary"
                                  onClick={async () => {
                                    try {
                                      await navigator.clipboard.writeText(m.testo);
                                      say('Testo copiato negli appunti.');
                                    } catch {
                                      say('Impossibile copiare.', true);
                                    }
                                  }}
                                >
                                  <Copy size={15} /> Copia testo
                                </button>

                                <button
                                  type="button"
                                  className="btn btn--secondary"
                                  onClick={() => {
                                    const area = document.getElementById(`mod-${m.id}`) as HTMLTextAreaElement;
                                    if (!area) return;
                                    startTransition(async () => {
                                      const res = await saveModelloAction({
                                        id: m.id,
                                        nome: m.nome,
                                        categoria: m.categoria,
                                        testo: area.value,
                                      });
                                      if (res.ok) {
                                        setModelli((prev) =>
                                          prev.map((it) => (it.id === m.id ? res.modello : it))
                                        );
                                        say('Modello aggiornato.');
                                      } else {
                                        say(res.error, true);
                                      }
                                    });
                                  }}
                                >
                                  Salva modifiche
                                </button>

                                <button
                                  type="button"
                                  className="btn btn--danger"
                                  onClick={() => handleDeleteModello(m.id)}
                                >
                                  <Trash2 size={15} /> Elimina
                                </button>
                              </div>
                            </form>
                          </details>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Form Nuovo Modello */}
              <div className="pcard">
                <h3 className="pcard__title">Nuovo modello</h3>
                <div className="el-form">
                  <div className="el-grid">
                    <div className="field">
                      <span>Nome modello</span>
                      <input
                        type="text"
                        placeholder="Es. Promemoria barba"
                        value={nuovoModelloNome}
                        onChange={(e) => setNuovoModelloNome(e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <span>Categoria</span>
                      <select
                        value={nuovoModelloCat}
                        onChange={(e) => setNuovoModelloCat(e.target.value as Categoria)}
                      >
                        {CATEGORIE.map(([cId, cName]) => (
                          <option key={cId} value={cId}>
                            {cName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="field">
                    <span>Testo</span>
                    <textarea
                      rows={4}
                      placeholder="{nome} diventa il nome del cliente, {barbiere} il barbiere, {prenota} il link."
                      value={nuovoModelloTesto}
                      onChange={(e) => setNuovoModelloTesto(e.target.value)}
                    />
                  </div>

                  <div className="actions">
                    <button
                      type="button"
                      className="btn btn--primary"
                      onClick={handleSaveNuovoModello}
                    >
                      <Plus size={15} /> Aggiungi modello
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VISTA ANALISI */}
          {railTab === 'analisi' && (
            <div>
              <header className="el-pagehead">
                <h2>Analisi</h2>
              </header>
              <p className="pcard__note mb-4">
                Questi sono i numeri della rubrica: contatti, consensi, nuovi e da richiamare.
              </p>
              <div className="el-kpis">
                <article className="el-kpi">
                  <span>Contatti</span>
                  <b>{stats.totale}</b>
                  <small>in rubrica</small>
                </article>
                <article className="el-kpi">
                  <span>Con consenso</span>
                  <b>{stats.consenso}</b>
                  <small>possono ricevere campagne</small>
                </article>
                <article className="el-kpi">
                  <span>Nuovi</span>
                  <b>{stats.nuovi}</b>
                  <small>negli ultimi 7 giorni</small>
                </article>
                <article className="el-kpi">
                  <span>Da richiamare</span>
                  <b>{stats.richiamare}</b>
                  <small>da sentire presto</small>
                </article>
              </div>
            </div>
          )}

          {/* VISTA PRENOTAZIONI */}
          {railTab === 'prenota' && (
            <div>
              <header className="el-pagehead">
                <h2>Prenotazioni</h2>
              </header>
              <div className="pcard">
                <p className="pcard__note">
                  La gestione appuntamenti e calendario è integrata con il sistema del salone.
                </p>
                <div className="actions mt-4">
                  <a href={prenotaUrl} target="_blank" rel="noopener noreferrer" className="btn btn--primary">
                    <ExternalLink size={15} /> Apri pagina prenotazioni
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* VISTA IMPOSTAZIONI */}
          {railTab === 'settings' && (
            <div>
              <header className="el-pagehead">
                <h2>Impostazioni</h2>
              </header>
              <div className="pcard">
                <h3 className="pcard__title">Stato sincronizzazione</h3>
                <p className="pcard__note">
                  Eliseo CRM è collegato a Supabase e sincronizzato con il database di Barberia Garofalo.
                </p>
                <div className="actions mt-3">
                  <button type="button" className="btn btn--secondary" onClick={handleCopyIscritti}>
                    Sincronizza iscritti al sito
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Barra di stato in basso */}
        {statusMsg && (
          <p className="el-status" data-state={statusBad ? 'error' : 'ok'}>
            {statusMsg}
          </p>
        )}
      </div>

      {/* MODALE NUOVO / MODIFICA CONTATTO */}
      {isContactModalOpen && editingContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-2xl text-black">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold">
                {editingContact.id ? `Modifica: ${editingContact.nome}` : 'Nuovo contatto'}
              </h3>
              <button
                type="button"
                onClick={() => setIsContactModalOpen(false)}
                className="text-gray-400 hover:text-black"
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
                  {contactFormErrors.email && (
                    <span className="field__error">{contactFormErrors.email}</span>
                  )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-2xl text-black">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold">Importa contatti da CSV</h3>
              <button
                type="button"
                onClick={() => setIsCsvModalOpen(false)}
                className="text-gray-400 hover:text-black"
              >
                <X size={20} />
              </button>
            </div>

            <div className="el-form mt-4">
              <p className="pcard__note">
                Carica un file CSV con colonne: Nome, Telefono, Email. I duplicati già presenti non
                verranno sovrascritti.
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
                <div className="rounded-lg bg-gray-50 p-4 border text-sm">
                  {csvPlan.errore ? (
                    <p className="text-red-600 font-semibold">{csvPlan.errore}</p>
                  ) : (
                    <div>
                      <p className="font-semibold text-green-700">
                        {csvPlan.nuovi.length} contatti nuovi pronti per l’importazione
                      </p>
                      <p className="text-gray-600 text-xs mt-1">
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
