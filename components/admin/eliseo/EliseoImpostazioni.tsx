'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3, Bot, CreditCard, Fingerprint, Globe, KeyRound, Link2, Lock, MessagesSquare, Scale, Settings, ShieldCheck,
  Smartphone, User, Users,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { signOut, updateUserPassword } from '@/lib/actions/auth';
import { LogoutSubmit } from '@/components/layout/LogoutSubmit';
import {
  ACCOUNT_COLLEGATI, CANALI, LINGUE, type CanaleId, type EliseoImpostazioni,
} from '@/lib/utils/eliseo-impostazioni';
import './eliseo-settings.css';

type Sezione =
  | 'generali' | 'conversazioni' | 'contatti' | 'team' | 'account-collegati' | 'analisi' | 'lingua'
  | `canale-${CanaleId}`
  | 'account' | 'fatturazione' | 'sicurezza' | 'legale' | 'assistenti';

type Props = {
  area: 'impostazioni' | 'profilo';
  value: EliseoImpostazioni;
  onSave: (next: EliseoImpostazioni) => Promise<boolean>;
  team: Array<{ id: string; nome: string }>;
  tester: boolean;
  waConnected: boolean;
  waPhone: string | null;
  account: { email: string | null; fullName: string | null; role: string };
  onGoTo: (dest: 'whatsapp' | 'modelli' | 'cartelle' | 'contatti' | 'file') => void;
};

const PAESI = (() => {
  const codes = 'IT SM VA CH FR DE ES PT GB IE NL BE LU AT PL CZ SK HU RO BG GR HR SI RS AL MK ME BA MT CY DK SE NO FI IS EE LV LT UA MD BY RU TR US CA MX BR AR CL CO PE VE AU NZ JP CN KR IN PK BD LK PH VN TH ID MY SG AE SA QA KW IL EG MA TN DZ NG SN GH KE ZA ET'.split(' ');
  let names: Intl.DisplayNames | null = null;
  try { names = new Intl.DisplayNames(['it'], { type: 'region' }); } catch { names = null; }
  return codes.map((c) => [c, names?.of(c) || c] as [string, string]).sort((a, b) => a[1].localeCompare(b[1], 'it'));
})();

const FUSI: string[] = (() => {
  try {
    const f = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.('timeZone');
    if (f && f.length) return f;
  } catch { /* browser vecchio */ }
  return ['Europe/Rome', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid', 'America/New_York', 'Asia/Tokyo'];
})();

function Riga({ titolo, nota, children }: { titolo: string; nota?: string; children: React.ReactNode }) {
  return (
    <div className="es-row">
      <div className="es-row__txt">
        <strong>{titolo}</strong>
        {nota && <span>{nota}</span>}
      </div>
      <div className="es-row__ctl">{children}</div>
    </div>
  );
}

function Interruttore({ on, onChange, disabled, label }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      className="es-switch"
      onClick={() => onChange(!on)}
    >
      <span />
    </button>
  );
}

function Stato({ ok, testo }: { ok: boolean; testo: string }) {
  return <span className={`pchip ${ok ? 'pchip--ok' : 'pchip--wait'}`}>{testo}</span>;
}

export function EliseoImpostazioni({ area, value, onSave, team, tester, waConnected, waPhone, account, onGoTo }: Props) {
  const [sez, setSez] = useState<Sezione>(area === 'profilo' ? 'account' : 'generali');
  const [draft, setDraft] = useState<EliseoImpostazioni>(value);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ t: string; bad?: boolean } | null>(null);

  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { setSez(area === 'profilo' ? 'account' : 'generali'); }, [area]);

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(value), [draft, value]);
  const say = (t: string, bad = false) => { setMsg({ t, bad }); setTimeout(() => setMsg(null), 5000); };

  const set = <K extends keyof EliseoImpostazioni>(k: K, patch: Partial<EliseoImpostazioni[K]>) =>
    setDraft((d) => ({ ...d, [k]: { ...(d[k] as object), ...patch } as EliseoImpostazioni[K] }));

  async function salva() {
    if (tester) return say('Modalità tester: puoi guardare ma non modificare.', true);
    setSaving(true);
    const ok = await onSave(draft);
    setSaving(false);
    say(ok ? 'Salvato.' : 'Salvataggio non riuscito. Riprova.', !ok);
  }

  const navImp: Array<[Sezione, string, React.ReactNode]> = [
    ['generali', 'Generali', <Settings key="i" size={15} />],
    ['conversazioni', 'Conversazioni', <MessagesSquare key="i" size={15} />],
    ['contatti', 'Contatti', <Users key="i" size={15} />],
    ['team', 'Team', <User key="i" size={15} />],
    ['account-collegati', 'Account collegati', <Link2 key="i" size={15} />],
    ['analisi', 'Analisi', <BarChart3 key="i" size={15} />],
    ['lingua', 'Lingua e Privacy', <Globe key="i" size={15} />],
  ];
  const navProf: Array<[Sezione, string, React.ReactNode]> = [
    ['account', 'Account', <User key="i" size={15} />],
    ['fatturazione', 'Fatturazione', <CreditCard key="i" size={15} />],
    ['sicurezza', 'Sicurezza', <ShieldCheck key="i" size={15} />],
    ['legale', 'Note legali', <Scale key="i" size={15} />],
    ['assistenti', 'Assistenti AI', <Bot key="i" size={15} />],
  ];

  const statoCanale = (id: CanaleId): { ok: boolean; testo: string } => {
    if (id === 'whatsapp') return waConnected ? { ok: true, testo: 'Connesso' } : { ok: false, testo: 'Non collegato' };
    if (id === 'widget') return draft.canali.widget.attivo ? { ok: true, testo: 'Attivo' } : { ok: false, testo: 'Spento' };
    return { ok: false, testo: 'Da collegare' };
  };

  // Le voci che cambiano i dati e quindi mostrano Annulla / Salva in fondo.
  const conSalva = !['conversazioni', 'team', 'fatturazione', 'sicurezza', 'canale-whatsapp'].includes(sez);

  return (
    <div className="es">
      <nav className="es-nav" aria-label={area === 'profilo' ? 'Profilo' : 'Impostazioni'}>
        <p className="es-nav__title">{area === 'profilo' ? 'Profilo' : 'Impostazioni'}</p>
        {(area === 'profilo' ? navProf : navImp).map(([id, label, icon]) => (
          <button key={id} type="button" className="es-nav__btn" aria-current={sez === id ? 'page' : undefined} onClick={() => setSez(id)}>
            {icon}
            <span>{label}</span>
          </button>
        ))}
        {area === 'impostazioni' && (
          <>
            <p className="es-nav__group">Canali</p>
            {CANALI.map((c) => {
              const st = statoCanale(c.id);
              return (
                <button key={c.id} type="button" className="es-nav__btn es-nav__btn--sub" aria-current={sez === `canale-${c.id}` ? 'page' : undefined} onClick={() => setSez(`canale-${c.id}`)}>
                  <span>{c.nome}</span>
                  <i className={st.ok ? 'is-ok' : ''}>{st.testo}</i>
                </button>
              );
            })}
          </>
        )}
      </nav>

      <section className="es-main">
        {sez === 'generali' && (
          <>
            <h2 className="es-h">Generali</h2>
            <Riga titolo="Widget del sito web" nota="La chat di Eliseo sul sito del negozio.">
              <Interruttore label="Widget del sito web" on={draft.generali.widget} onChange={(v) => { set('generali', { widget: v }); set('canali', { widget: { ...draft.canali.widget, attivo: v } }); }} />
            </Riga>
            <Riga titolo="Email obbligatoria" nota="Chiedi ai clienti un'email valida per iniziare una nuova conversazione.">
              <Interruttore label="Email obbligatoria" on={draft.generali.emailObbligatoria} onChange={(v) => set('generali', { emailObbligatoria: v })} />
            </Riga>
            <Riga titolo="Telefono obbligatorio" nota="Chiedi ai clienti un numero di telefono valido per iniziare una nuova conversazione.">
              <Interruttore label="Telefono obbligatorio" on={draft.generali.telefonoObbligatorio} onChange={(v) => set('generali', { telefonoObbligatorio: v })} />
            </Riga>
            <Riga titolo="Messaggi a bolle" nota="Mostra un messaggio a bolla vicino al pulsante della chat.">
              <Interruttore label="Messaggi a bolle" on={draft.generali.messaggiBolla} onChange={(v) => set('generali', { messaggiBolla: v })} />
            </Riga>
            <Riga titolo="Ritardo nella risposta" nota="Attendi qualche secondo prima di rispondere, come una persona che legge e scrive.">
              <Interruttore label="Ritardo nella risposta" on={draft.generali.ritardoRisposta} onChange={(v) => set('generali', { ritardoRisposta: v })} />
            </Riga>
            <h3 className="es-h3">Lettura immagini</h3>
            <p className="es-note">Le immagini mandate in chat vengono descritte in automatico. Scrivi quali dettagli contano di più.</p>
            <textarea
              className="es-input es-input--area"
              rows={3}
              maxLength={2000}
              placeholder="Es. «Descrivi taglio, lunghezza e sfumatura della foto»"
              value={draft.generali.promptImmagini}
              onChange={(e) => set('generali', { promptImmagini: e.target.value })}
            />
            <h3 className="es-h3">Chiusura automatica conversazione</h3>
            <Riga titolo="Chiudi dopo inattività" nota="Chiudi la conversazione dopo il tempo impostato senza messaggi.">
              <span className="es-inline">
                <input
                  type="number"
                  min={5}
                  max={10080}
                  className="es-input es-input--num"
                  aria-label="Minuti di inattività"
                  value={draft.generali.minutiInattivita}
                  disabled={!draft.generali.chiusuraInattivita}
                  onChange={(e) => set('generali', { minutiInattivita: Number(e.target.value) })}
                />
                <small>min</small>
                <Interruttore label="Chiudi dopo inattività" on={draft.generali.chiusuraInattivita} onChange={(v) => set('generali', { chiusuraInattivita: v })} />
              </span>
            </Riga>
            <Riga titolo="Chiudi quando il cliente conferma che è tutto risolto" nota="Riconosce messaggi come «grazie, ciao» e chiude poco dopo.">
              <Interruttore label="Chiudi quando è risolto" on={draft.generali.chiusuraRisolto} onChange={(v) => set('generali', { chiusuraRisolto: v })} />
            </Riga>
          </>
        )}

        {sez === 'conversazioni' && (
          <>
            <h2 className="es-h">Conversazioni</h2>
            <p className="es-note">Modelli di messaggio, cartelle ed etichette delle chat.</p>
            <div className="es-cards">
              <button type="button" className="es-card" onClick={() => onGoTo('modelli')}><strong>Modelli</strong><span>Messaggi già scritti da usare in chat.</span></button>
              <button type="button" className="es-card" onClick={() => onGoTo('cartelle')}><strong>Cartelle ed etichette</strong><span>Ordina le chat come vuoi.</span></button>
            </div>
          </>
        )}

        {sez === 'contatti' && (
          <>
            <h2 className="es-h">Contatti</h2>
            <p className="es-note">I dati di ogni contatto. Nome, telefono, email, fase ed etichette sono sempre presenti.</p>
            <ul className="es-list">
              {['Nome', 'Telefono', 'Email', 'Fase (prenotato, nuovo, abituale, da richiamare, perso)', 'Etichette', 'Note'].map((p) => (
                <li key={p}><span>{p}</span><Stato ok testo="Attivo" /></li>
              ))}
            </ul>
            <button type="button" className="btn btn--secondary" onClick={() => onGoTo('contatti')}>Apri la rubrica</button>
          </>
        )}

        {sez === 'team' && (
          <>
            <h2 className="es-h">Team</h2>
            <p className="es-note">Chi lavora nel negozio e può ricevere le conversazioni passate da Eliseo.</p>
            <ul className="es-list">
              {account.email && (
                <li><span><strong>{account.fullName || 'Tu'}</strong> · {account.email}</span><Stato ok testo={account.role === 'admin' ? 'Proprietario · tutti i permessi' : account.role} /></li>
              )}
              {team.map((t) => (
                <li key={t.id}><span>{t.nome}</span><Stato ok={false} testo="Operatore" /></li>
              ))}
            </ul>
            <p className="es-note">Nuovi collaboratori e permessi si gestiscono in <a className="link-button" href="/admin/staff">Gestione team</a>.</p>
          </>
        )}

        {sez === 'account-collegati' && (
          <>
            <h2 className="es-h">Account collegati</h2>
            <p className="es-note">Account esterni usati da campagne, automazioni e integrazioni.</p>
            {ACCOUNT_COLLEGATI.map((a) => (
              <div key={a.id} className="es-acc">
                <div className="es-row__txt">
                  <strong>{a.nome}</strong>
                  <span>{a.nota}</span>
                </div>
                <Stato ok={draft.account[a.id].collegato} testo={draft.account[a.id].collegato ? 'Connesso' : 'Non connesso'} />
                <input
                  className="es-input"
                  placeholder={a.id === 'google_sheets' ? 'Link del foglio Google' : a.id === 'email' ? 'indirizzo@negozio.it' : 'Account da collegare'}
                  value={draft.account[a.id].riferimento}
                  onChange={(e) => set('account', { [a.id]: { ...draft.account[a.id], riferimento: e.target.value } } as Partial<EliseoImpostazioni['account']>)}
                />
              </div>
            ))}
            <p className="es-note">I fogli Google si collegano anche da Addestramento → File → «Collega Google Sheet».</p>
          </>
        )}

        {sez === 'analisi' && (
          <>
            <h2 className="es-h">Analisi</h2>
            <Riga titolo="Email di recap settimanale" nota="Ogni settimana un riepilogo degli ultimi 7 giorni: conversazioni e campagne.">
              <Interruttore label="Recap settimanale" on={draft.analisi.recapSettimanale} onChange={(v) => set('analisi', { recapSettimanale: v })} />
            </Riga>
            <Riga titolo="Tracciamento dei clic sui link" nota="I link mandati da Eliseo vengono contati per sapere quanti li aprono.">
              <Interruttore label="Tracciamento link" on={draft.analisi.tracciaLink} onChange={(v) => set('analisi', { tracciaLink: v })} />
            </Riga>
          </>
        )}

        {sez === 'lingua' && (
          <>
            <h2 className="es-h">Lingua e Privacy</h2>
            <div className="es-grid">
              <label className="es-field"><span>Lingua</span>
                <select className="es-input" value={draft.lingua.lingua} onChange={(e) => set('lingua', { lingua: e.target.value })}>
                  {LINGUE.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
                </select>
              </label>
              <label className="es-field"><span>Paese</span>
                <select className="es-input" value={draft.lingua.paese} onChange={(e) => set('lingua', { paese: e.target.value })}>
                  {PAESI.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
                </select>
              </label>
              <label className="es-field"><span>Fuso orario</span>
                <select className="es-input" value={draft.lingua.fusoOrario} onChange={(e) => set('lingua', { fusoOrario: e.target.value })}>
                  {FUSI.map((f) => <option key={f} value={f}>{f.replace(/_/g, ' ')}</option>)}
                </select>
              </label>
              <label className="es-field"><span>Lingua delle notifiche</span>
                <select className="es-input" value={draft.lingua.linguaNotifiche} onChange={(e) => set('lingua', { linguaNotifiche: e.target.value })}>
                  {LINGUE.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
                </select>
              </label>
            </div>
            <h3 className="es-h3">Informativa sulla privacy</h3>
            <p className="es-note">Il cliente la deve leggere e accettare per iniziare una nuova conversazione.</p>
            <input className="es-input" type="url" placeholder="https://…/privacy" value={draft.lingua.privacyUrl} onChange={(e) => set('lingua', { privacyUrl: e.target.value })} />
            <Riga titolo="Consenso marketing" nota="Casella facoltativa per ricevere promozioni, separata dalla privacy.">
              <Interruttore label="Consenso marketing" on={draft.lingua.consensoMarketing} onChange={(v) => set('lingua', { consensoMarketing: v })} />
            </Riga>
            <Riga titolo="Conservazione dei dati" nota="Per quanto tempo si tengono conversazioni e trascrizioni.">
              <select className="es-input es-input--auto" value={draft.lingua.conservazioneGiorni} onChange={(e) => set('lingua', { conservazioneGiorni: Number(e.target.value) })}>
                <option value={0}>Senza limite</option>
                <option value={30}>30 giorni</option>
                <option value={90}>90 giorni</option>
                <option value={180}>6 mesi</option>
                <option value={365}>1 anno</option>
                <option value={730}>2 anni</option>
              </select>
            </Riga>
          </>
        )}

        {sez.startsWith('canale-') && (() => {
          const id = sez.slice(7) as CanaleId;
          const c = CANALI.find((x) => x.id === id)!;
          const st = statoCanale(id);
          return (
            <>
              <h2 className="es-h">{c.nome} <Stato ok={st.ok} testo={st.testo} /></h2>
              <p className="es-note">{c.nota}</p>
              {id === 'whatsapp' && (
                <>
                  <ul className="es-list">
                    <li><span>Numero collegato</span><strong>{waConnected ? waPhone || 'Collegato' : 'Nessuno'}</strong></li>
                  </ul>
                  <button type="button" className="btn btn--primary" onClick={() => onGoTo('whatsapp')}>
                    {waConnected ? 'Gestisci o disconnetti' : 'Collega con il QR'}
                  </button>
                </>
              )}
              {id === 'widget' && (
                <Riga titolo="Chat sul sito" nota="Accendi o spegni la chat di Eliseo sul sito.">
                  <Interruttore label="Chat sul sito" on={draft.canali.widget.attivo} onChange={(v) => { set('canali', { widget: { ...draft.canali.widget, attivo: v } }); set('generali', { widget: v }); }} />
                </Riga>
              )}
              {id !== 'whatsapp' && id !== 'widget' && (
                <>
                  <label className="es-field">
                    <span>{id === 'instagram' ? 'Account Instagram (es. @negozio)' : id === 'messenger' ? 'Pagina Facebook' : id === 'email' ? 'Indirizzo email del negozio' : 'Numero di telefono'}</span>
                    <input
                      className="es-input"
                      value={draft.canali[id].riferimento}
                      onChange={(e) => set('canali', { [id]: { ...draft.canali[id], riferimento: e.target.value } } as Partial<EliseoImpostazioni['canali']>)}
                    />
                  </label>
                  <p className="es-note es-note--box">
                    {id === 'instagram' || id === 'messenger'
                      ? 'Per collegarlo serve l’accesso a Meta Business del negozio (account professionale e pagina Facebook). Quando c’è, il collegamento si fa da qui.'
                      : id === 'email'
                        ? 'Per leggere e rispondere alle email serve la casella del negozio con l’accesso IMAP o Gmail.'
                        : 'L’agente vocale per le chiamate non è ancora attivo.'}
                  </p>
                </>
              )}
            </>
          );
        })()}

        {sez === 'account' && (
          <>
            <h2 className="es-h">Account</h2>
            <p className="es-note">Il tuo profilo, come ti contattiamo e l’azienda per cui lavori.</p>
            <div className="es-grid">
              <label className="es-field"><span>Nome</span><input className="es-input" value={draft.profilo.nome} onChange={(e) => set('profilo', { nome: e.target.value })} /></label>
              <label className="es-field"><span>Cognome</span><input className="es-input" value={draft.profilo.cognome} onChange={(e) => set('profilo', { cognome: e.target.value })} /></label>
              <label className="es-field"><span>Email</span><input className="es-input" value={account.email || ''} readOnly /></label>
              <label className="es-field"><span>Telefono</span><input className="es-input" type="tel" placeholder="+39" value={draft.profilo.telefono} onChange={(e) => set('profilo', { telefono: e.target.value })} /></label>
              <label className="es-field"><span>Nome azienda</span><input className="es-input" value={draft.profilo.azienda} onChange={(e) => set('profilo', { azienda: e.target.value })} /></label>
              <label className="es-field"><span>Settore</span><input className="es-input" value={draft.profilo.settore} onChange={(e) => set('profilo', { settore: e.target.value })} /></label>
              <label className="es-field"><span>Ruolo</span><input className="es-input" value={draft.profilo.ruolo} onChange={(e) => set('profilo', { ruolo: e.target.value })} /></label>
            </div>
            <h3 className="es-h3">Sessione</h3>
            <Riga titolo="Esci" nota="Termina la sessione su questo dispositivo.">
              <form action={signOut}>
                <LogoutSubmit ariaLabel="Esci dall'account" pendingLabel="Uscita in corso…" className="btn btn--secondary">Esci</LogoutSubmit>
              </form>
            </Riga>
          </>
        )}

        {sez === 'fatturazione' && (
          <>
            <h2 className="es-h">Fatturazione</h2>
            <p className="es-note es-note--box">Piano, canone e fatture si decidono più avanti con Maurizio. Per ora non c’è nessun pagamento.</p>
          </>
        )}

        {sez === 'sicurezza' && <Sicurezza tester={tester} say={say} />}

        {sez === 'legale' && (
          <>
            <h2 className="es-h">Note legali</h2>
            <p className="es-note">I dati dell’azienda che fornisce il servizio e i documenti legali.</p>
            <div className="es-grid">
              <label className="es-field"><span>Nome azienda</span><input className="es-input" value={draft.legale.ragioneSociale} onChange={(e) => set('legale', { ragioneSociale: e.target.value })} /></label>
              <label className="es-field"><span>Partita IVA</span><input className="es-input" inputMode="numeric" maxLength={11} value={draft.legale.partitaIva} onChange={(e) => set('legale', { partitaIva: e.target.value.replace(/\D/g, '') })} /></label>
              <label className="es-field es-field--wide"><span>Sede legale</span><input className="es-input" value={draft.legale.sedeLegale} onChange={(e) => set('legale', { sedeLegale: e.target.value })} /></label>
              <label className="es-field"><span>Termini e condizioni (link)</span><input className="es-input" type="url" value={draft.legale.terminiUrl} onChange={(e) => set('legale', { terminiUrl: e.target.value })} /></label>
              <label className="es-field"><span>Informativa privacy (link)</span><input className="es-input" type="url" value={draft.legale.privacyUrl} onChange={(e) => set('legale', { privacyUrl: e.target.value })} /></label>
            </div>
            <p className="es-note">I testi di Termini e Privacy arrivano dall’avvocato.</p>
          </>
        )}

        {sez === 'assistenti' && (
          <>
            <h2 className="es-h">Assistenti AI</h2>
            <p className="es-note">Il motore che scrive le risposte di Eliseo. Solo servizi gratuiti.</p>
            <ul className="es-list">
              <li><span><strong>Groq</strong> · modelli gpt-oss</span><Stato ok testo="In uso" /></li>
              <li><span><strong>Gemini</strong> (Google)</span><Stato ok={false} testo="Spento: piano gratuito non adatto in Europa" /></li>
              <li><span><strong>Claude</strong> (Anthropic)</span><Stato ok={false} testo="Non collegato: a pagamento" /></li>
              <li><span><strong>Grok</strong> (xAI)</span><Stato ok={false} testo="Non collegato" /></li>
            </ul>
            <p className="es-note">Chiavi e modelli si cambiano dall’admin in «Assistente AI». Se un servizio non risponde, Eliseo usa le risposte a regole.</p>
          </>
        )}

        {conSalva && (
          <div className="es-actions">
            {msg && <span className={`es-msg ${msg.bad ? 'is-bad' : ''}`} role="status">{msg.t}</span>}
            <button type="button" className="btn btn--secondary" disabled={!dirty || saving} onClick={() => setDraft(value)}>Annulla</button>
            <button type="button" className="btn btn--primary" disabled={!dirty || saving || tester} onClick={salva}>{saving ? 'Salvo…' : 'Salva'}</button>
          </div>
        )}
        {!conSalva && msg && <p className={`es-msg ${msg.bad ? 'is-bad' : ''}`} role="status">{msg.t}</p>}
      </section>
    </div>
  );
}

type Fattore = { id: string; factor_type: string; friendly_name?: string; status: string };

function Sicurezza({ tester, say }: { tester: boolean; say: (t: string, bad?: boolean) => void }) {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [fattori, setFattori] = useState<Fattore[]>([]);
  const [enroll, setEnroll] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState('');

  async function carica() {
    const sb = createClient();
    if (!sb) return;
    const { data } = await sb.auth.mfa.listFactors();
    setFattori(((data?.all ?? []) as Fattore[]).filter((f) => f.status === 'verified'));
  }
  useEffect(() => { void carica(); }, []);

  const totp = fattori.find((f) => f.factor_type === 'totp');
  const passkeys = fattori.filter((f) => f.factor_type === 'webauthn');

  async function cambiaPassword(e: React.FormEvent) {
    e.preventDefault();
    if (tester) return say('Modalità tester: non puoi cambiare la password da qui.', true);
    if (pw.length < 12 || !/[a-z]/.test(pw) || !/[A-Z]/.test(pw) || !/\d/.test(pw) || !/[^A-Za-z0-9]/.test(pw)) {
      return say('Almeno 12 caratteri, con maiuscola, minuscola, un numero e un simbolo.', true);
    }
    if (pw !== pw2) return say('Le due password non sono uguali.', true);
    setBusy(true);
    const res = await updateUserPassword(pw);
    setBusy(false);
    if (res.error) return say(res.error, true);
    setPw(''); setPw2('');
    say('Password cambiata.');
  }

  async function iniziaTotp() {
    const sb = createClient();
    if (!sb) return;
    setBusy(true);
    // Un tentativo lasciato a metà blocca il nuovo: si toglie prima.
    const { data: list } = await sb.auth.mfa.listFactors();
    for (const f of (list?.all ?? []) as Fattore[]) if (f.factor_type === 'totp' && f.status !== 'verified') await sb.auth.mfa.unenroll({ factorId: f.id });
    const { data, error } = await sb.auth.mfa.enroll({ factorType: 'totp', friendlyName: `App ${new Date().toLocaleDateString('it-IT')}` });
    setBusy(false);
    if (error || !data) return say(error?.message || 'Non riesco ad attivarla. Controlla che la verifica in due passaggi sia accesa in Supabase.', true);
    setEnroll({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }

  async function confermaTotp(e: React.FormEvent) {
    e.preventDefault();
    const sb = createClient();
    if (!sb || !enroll) return;
    setBusy(true);
    const { error } = await sb.auth.mfa.challengeAndVerify({ factorId: enroll.id, code: code.replace(/\s/g, '') });
    setBusy(false);
    if (error) return say('Codice non valido. Usa quello nuovo dell’app.', true);
    setEnroll(null); setCode('');
    await carica();
    say('Verifica in due passaggi attiva. Al prossimo accesso ti chiederà il codice.');
  }

  async function aggiungiPasskey() {
    const sb = createClient();
    if (!sb) return;
    if (typeof window === 'undefined' || !window.PublicKeyCredential) return say('Questo browser non supporta le passkey.', true);
    setBusy(true);
    const { error } = await sb.auth.mfa.webauthn.register({ friendlyName: `Passkey ${navigator.platform || ''} ${new Date().toLocaleDateString('it-IT')}`.trim() });
    setBusy(false);
    if (error) return say(`Passkey non aggiunta: ${error.message}. Se dice che non è abilitata, va accesa in Supabase (Authentication → MFA → WebAuthn).`, true);
    await carica();
    say('Passkey aggiunta. Al prossimo accesso potrai usare impronta, volto o blocco schermo.');
  }

  async function rimuovi(id: string) {
    const sb = createClient();
    if (!sb) return;
    setBusy(true);
    const { error } = await sb.auth.mfa.unenroll({ factorId: id });
    setBusy(false);
    if (error) return say(error.message, true);
    await carica();
    say('Rimosso.');
  }

  return (
    <>
      <h2 className="es-h">Sicurezza</h2>
      <p className="es-note">Scegli come accedere e proteggi il tuo account.</p>

      <div className="es-block">
        <h3 className="es-h3"><KeyRound size={16} /> Password</h3>
        <p className="es-note">Almeno 12 caratteri, con maiuscole, minuscole, un numero e un simbolo.</p>
        <form className="es-grid" onSubmit={cambiaPassword}>
          <label className="es-field"><span>Nuova password</span><input className="es-input" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></label>
          <label className="es-field"><span>Ripeti la password</span><input className="es-input" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></label>
          <div><button type="submit" className="btn btn--secondary" disabled={busy || !pw}>Cambia password</button></div>
        </form>
      </div>

      <div className="es-block">
        <h3 className="es-h3"><Smartphone size={16} /> Autenticazione a due fattori</h3>
        <p className="es-note">A ogni accesso, oltre alla password, un codice dall’app Google Authenticator (o un’altra app TOTP).</p>
        {totp ? (
          <Riga titolo="App di autenticazione" nota="Attiva">
            <button type="button" className="btn btn--danger" disabled={busy || tester} onClick={() => rimuovi(totp.id)}>Disattiva</button>
          </Riga>
        ) : enroll ? (
          <form className="es-enroll" onSubmit={confermaTotp}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={enroll.qr} alt="Codice QR da inquadrare con l'app di autenticazione" width={180} height={180} />
            <div>
              <p className="es-note">1. Apri Google Authenticator e inquadra il QR.<br />2. Scrivi qui il codice di 6 cifre.</p>
              <p className="es-note">Se non puoi inquadrare, inserisci questa chiave: <code>{enroll.secret}</code></p>
              <input className="es-input es-input--num" inputMode="numeric" autoComplete="one-time-code" placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} />
              <div className="es-inline">
                <button type="submit" className="btn btn--primary" disabled={busy || code.length < 6}>Conferma</button>
                <button type="button" className="btn btn--secondary" onClick={() => setEnroll(null)}>Annulla</button>
              </div>
            </div>
          </form>
        ) : (
          <Riga titolo="App di autenticazione" nota="Non configurata">
            <button type="button" className="btn btn--primary" disabled={busy || tester} onClick={iniziaTotp}>Attiva 2FA</button>
          </Riga>
        )}
      </div>

      <div className="es-block">
        <h3 className="es-h3"><Fingerprint size={16} /> Passkey</h3>
        <p className="es-note">Accedi con impronta digitale, volto o blocco schermo di questo dispositivo.</p>
        {passkeys.length === 0 && <p className="es-note">Nessuna passkey.</p>}
        <ul className="es-list">
          {passkeys.map((p) => (
            <li key={p.id}><span>{p.friendly_name || 'Passkey'}</span><button type="button" className="btn btn--danger" disabled={busy || tester} onClick={() => rimuovi(p.id)}>Rimuovi</button></li>
          ))}
        </ul>
        <button type="button" className="btn btn--secondary" disabled={busy || tester} onClick={aggiungiPasskey}><Lock size={14} /> Aggiungi passkey</button>
      </div>
    </>
  );
}

