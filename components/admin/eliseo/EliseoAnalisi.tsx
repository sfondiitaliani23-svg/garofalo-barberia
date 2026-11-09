'use client';

import { useMemo } from 'react';
import { analisiConversazioni, variazione, type AnalisiInput } from '@/lib/utils/eliseo-analisi';
import './eliseo-settings.css';

// Analisi come Keplero (09/11/2026): ultimi 7 giorni rispetto ai 7 precedenti, orario delle conversazioni, numeri della rubrica.

const GIORNI = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const FASCE = ['00', '03', '06', '09', '12', '15', '18', '21'];

function Kpi({ titolo, nota, ora, prima }: { titolo: string; nota: string; ora: number; prima: number }) {
  const v = variazione(ora, prima);
  return (
    <article className="el-kpi">
      <span>{titolo}</span>
      <b>{ora}</b>
      <small>
        {v === null ? '—' : `${v > 0 ? '+' : ''}${v}% rispetto ai 7 giorni prima`} · {nota}
      </small>
    </article>
  );
}

export function EliseoAnalisi({ casella, crm }: { casella: AnalisiInput[]; crm: { totale: number; consenso: number; nuovi: number; richiamare: number } }) {
  const r = useMemo(() => analisiConversazioni(casella), [casella]);
  return (
    <div>
      <header className="el-pagehead">
        <h2>Analisi</h2>
        <p>Ultimi 7 giorni · variazione rispetto ai 7 giorni precedenti.</p>
      </header>

      <h3 className="es-h3">Panoramica conversazioni</h3>
      <div className="el-kpis">
        <Kpi titolo="Conversazioni totali" nota="chat con almeno un messaggio" ora={r.conversazioni} prima={r.conversazioniPrima} />
        <Kpi titolo="Messaggi ricevuti" nota="tutti i canali" ora={r.messaggi} prima={r.messaggiPrima} />
        <Kpi titolo="Con intervento operatore" nota="chat assegnate a una persona" ora={r.conOperatore} prima={r.conOperatorePrima} />
      </div>

      <h3 className="es-h3">Orario attività</h3>
      <p className="es-note">Conversazioni iniziate per giorno e fascia oraria.</p>
      {r.max === 0 ? (
        <p className="es-note es-note--box">Nessuna conversazione negli ultimi 7 giorni.</p>
      ) : (
        <div className="es-heat" role="table" aria-label="Conversazioni per giorno e fascia oraria">
          <div className="es-heat__row" role="row">
            <span role="columnheader" />
            {FASCE.map((f) => <span key={f} role="columnheader" className="es-heat__lbl">{f}</span>)}
          </div>
          {r.mappa.map((riga, g) => (
            <div key={GIORNI[g]} className="es-heat__row" role="row">
              <span role="rowheader" className="es-heat__lbl">{GIORNI[g]}</span>
              {riga.map((n, f) => (
                <span
                  key={f}
                  role="cell"
                  className="es-heat__cell"
                  title={`${GIORNI[g]} ${FASCE[f]}:00 — ${n} conversazioni`}
                  style={{ opacity: n === 0 ? 0.08 : 0.25 + 0.75 * (n / r.max) }}
                >
                  {n || ''}
                </span>
              ))}
            </div>
          ))}
        </div>
      )}

      <h3 className="es-h3">Rubrica</h3>
      <div className="el-kpis">
        <article className="el-kpi"><span>Clienti totali</span><b>{crm.totale}</b><small>in rubrica</small></article>
        <article className="el-kpi"><span>Con consenso</span><b>{crm.consenso}</b><small>ricevono promozioni</small></article>
        <article className="el-kpi"><span>Nuovi (7 giorni)</span><b>{crm.nuovi}</b><small>prime visite</small></article>
        <article className="el-kpi"><span>Da richiamare</span><b>{crm.richiamare}</b><small>tempo giusto trascorso</small></article>
      </div>
    </div>
  );
}
