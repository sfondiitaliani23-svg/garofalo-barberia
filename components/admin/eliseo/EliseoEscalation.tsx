'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { GIORNI, fasciaLabel, type EliseoImpostazioni, type FasciaOperatori, type RegolaEscalation } from '@/lib/utils/eliseo-impostazioni';
import './eliseo-settings.css';

// Escalation come in Keplero (09/11/2026): acceso/spento, regole predefinite + regole proprie con «Assegna a», orari degli operatori.

type Props = {
  attiva: boolean;
  onToggle: (v: boolean) => void;
  value: EliseoImpostazioni;
  onSave: (next: EliseoImpostazioni) => Promise<boolean>;
  team: Array<{ id: string; nome: string }>;
  tester: boolean;
};

export function EliseoEscalation({ attiva, onToggle, value, onSave, team, tester }: Props) {
  const [regole, setRegole] = useState<RegolaEscalation[]>(value.escalation.regole);
  const [orari, setOrari] = useState<FasciaOperatori[]>(value.escalation.orari);
  const [nuova, setNuova] = useState('');
  const [nuovaA, setNuovaA] = useState('tutti');
  const [editOrari, setEditOrari] = useState(false);
  const [msg, setMsg] = useState<{ t: string; bad?: boolean } | null>(null);

  useEffect(() => {
    setRegole(value.escalation.regole);
    setOrari(value.escalation.orari);
  }, [value]);

  const say = (t: string, bad = false) => { setMsg({ t, bad }); setTimeout(() => setMsg(null), 4000); };

  async function salva(nextRegole = regole, nextOrari = orari) {
    if (tester) return say('Modalità tester: puoi guardare ma non modificare.', true);
    const ok = await onSave({ ...value, escalation: { regole: nextRegole, orari: nextOrari } });
    say(ok ? 'Salvato.' : 'Salvataggio non riuscito.', !ok);
  }

  function aggiungi() {
    const testo = nuova.trim();
    if (testo.length < 4) return;
    const next = [...regole, { id: `r${Date.now().toString(36)}`, testo, assegna: nuovaA, attiva: true }];
    setRegole(next);
    setNuova('');
    void salva(next);
  }

  function cambia(id: string, patch: Partial<RegolaEscalation>) {
    const next = regole.map((r) => (r.id === id ? { ...r, ...patch } : r));
    setRegole(next);
    void salva(next);
  }

  function togli(id: string) {
    const next = regole.filter((r) => r.id !== id);
    setRegole(next);
    void salva(next);
  }

  const assegnaSelect = (val: string, onChange: (v: string) => void, label: string) => (
    <label className="es-assign">
      <span>Assegna a</span>
      <select className="es-input es-input--auto" aria-label={label} value={val} disabled={!attiva} onChange={(e) => onChange(e.target.value)}>
        <option value="tutti">Qualsiasi operatore</option>
        {team.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
      </select>
    </label>
  );

  return (
    <div className="es-esc">
      <header className="el-faq__head">
        <h2>Escalation dell’agente chat</h2>
        <p>Quando Eliseo passa una conversazione a una persona del team, e a chi.</p>
      </header>

      <div className="es-block">
        <h3 className="es-h3">Escalation a operatore umano</h3>
        <p className="es-note">Quando Eliseo non può aiutare, passa la conversazione a una persona del team.</p>
        <div className="es-choice">
          <button type="button" className="es-choice__opt" aria-pressed={!attiva} disabled={tester} onClick={() => onToggle(false)}>
            <strong>Spento</strong>
            <span>Eliseo non passa mai la conversazione a una persona: gestisce ogni chat da solo.</span>
          </button>
          <button type="button" className="es-choice__opt" aria-pressed={attiva} disabled={tester} onClick={() => onToggle(true)}>
            <strong>Attivo</strong>
            <span>Eliseo segue le regole qui sotto e passa le conversazioni agli operatori.</span>
          </button>
        </div>
      </div>

      <div className={`es-block ${attiva ? '' : 'is-off'}`}>
        <h3 className="es-h3">Quando passare la conversazione</h3>
        <p className="es-note">Le regole predefinite ci sono sempre. Aggiungi i tuoi casi e scegli chi riceve ogni conversazione.</p>
        <div className="es-newrule">
          <input
            className="es-input"
            placeholder="Es. quando il cliente chiede un rimborso"
            value={nuova}
            maxLength={300}
            disabled={!attiva || tester}
            onChange={(e) => setNuova(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); aggiungi(); } }}
          />
          {assegnaSelect(nuovaA, setNuovaA, 'Assegna la nuova regola a')}
          <button type="button" className="btn btn--primary" disabled={!attiva || tester || nuova.trim().length < 4} onClick={aggiungi}>
            <Plus size={14} /> Aggiungi regola
          </button>
        </div>
        <p className="es-note">Premi Invio per aggiungerla.</p>

        <ul className="es-rules">
          {regole.map((r) => (
            <li key={r.id} className={r.attiva ? '' : 'is-muted'}>
              <div className="es-rules__txt">
                <strong>{r.testo}</strong>
                {r.predefinita && <span>Regola predefinita</span>}
              </div>
              {r.attiva ? assegnaSelect(r.assegna, (v) => cambia(r.id, { assegna: v }), `Assegna «${r.testo}» a`) : <span className="pchip pchip--wait">Spento</span>}
              <button
                type="button"
                role="switch"
                aria-checked={r.attiva}
                aria-label={`Regola attiva: ${r.testo}`}
                className="es-switch"
                disabled={!attiva || tester}
                onClick={() => cambia(r.id, { attiva: !r.attiva })}
              >
                <span />
              </button>
              {!r.predefinita && (
                <button type="button" className="es-icon" aria-label="Elimina regola" disabled={tester} onClick={() => togli(r.id)}>
                  <Trash2 size={15} />
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className={`es-block ${attiva ? '' : 'is-off'}`}>
        <h3 className="es-h3">Orari degli operatori</h3>
        <p className="es-note">Quando gli operatori possono prendere una chat. Fuori orario Eliseo avvisa il cliente e risponde da solo.</p>
        {!editOrari ? (
          <div className="es-row">
            <div className="es-row__txt">
              <strong>Orario settimanale</strong>
              {orari.map((f, i) => <span key={i}>{fasciaLabel(f)}</span>)}
            </div>
            <button type="button" className="btn btn--secondary" disabled={!attiva || tester} onClick={() => setEditOrari(true)}>Modifica</button>
          </div>
        ) : (
          <div className="es-hours">
            {orari.map((f, i) => (
              <div key={i} className="es-hours__row">
                <div className="es-days" role="group" aria-label={`Giorni della fascia ${i + 1}`}>
                  {GIORNI.map((g) => (
                    <button
                      key={g}
                      type="button"
                      aria-pressed={f.giorni.includes(g)}
                      onClick={() => setOrari(orari.map((x, j) => (j === i ? { ...x, giorni: x.giorni.includes(g) ? x.giorni.filter((y) => y !== g) : [...x.giorni, g] } : x)))}
                    >
                      {g}
                    </button>
                  ))}
                </div>
                <input type="time" className="es-input es-input--auto" aria-label="Dalle" value={f.da} onChange={(e) => setOrari(orari.map((x, j) => (j === i ? { ...x, da: e.target.value } : x)))} />
                <span>–</span>
                <input type="time" className="es-input es-input--auto" aria-label="Alle" value={f.a} onChange={(e) => setOrari(orari.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))} />
                {orari.length > 1 && (
                  <button type="button" className="es-icon" aria-label="Togli fascia" onClick={() => setOrari(orari.filter((_, j) => j !== i))}><Trash2 size={15} /></button>
                )}
              </div>
            ))}
            <div className="es-inline">
              <button type="button" className="btn btn--secondary" onClick={() => setOrari([...orari, { giorni: ['sab'], da: '09:00', a: '13:00' }])}><Plus size={14} /> Aggiungi fascia</button>
              <button type="button" className="btn btn--secondary" onClick={() => { setOrari(value.escalation.orari); setEditOrari(false); }}>Annulla</button>
              <button type="button" className="btn btn--primary" onClick={() => { setEditOrari(false); void salva(regole, orari.filter((f) => f.giorni.length)); }}>Salva orari</button>
            </div>
          </div>
        )}
      </div>
      {msg && <p className={`es-msg ${msg.bad ? 'is-bad' : ''}`} role="status">{msg.t}</p>}
    </div>
  );
}
