'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, Clock, ExternalLink, Scissors, Users } from 'lucide-react';
import { getCalendarioAction, type CalendarioData } from '@/lib/actions/eliseo-impostazioni';
import './eliseo-settings.css';

// Calendario come Keplero (09/11/2026): calendari (barbieri), fasce orarie, tipi di appuntamento (servizi)
// e agenda a colonne per barbiere, collegata alle prenotazioni vere del sito.

const giornoKey = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'Europe/Rome' });
const ora = (iso: string) => new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' });
const euro = (c: number) => `${(c / 100).toFixed(2).replace('.', ',')} €`;

export function EliseoCalendario({ prenotaUrl }: { prenotaUrl: string }) {
  const [data, setData] = useState<CalendarioData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [vista, setVista] = useState<'agenda' | 'impostazioni'>('agenda');
  const giorni = useMemo(() => Array.from({ length: 7 }, (_, i) => new Date(Date.now() + i * 86_400_000)), []);
  const [giorno, setGiorno] = useState(giornoKey(new Date()));

  useEffect(() => {
    getCalendarioAction()
      .then((r) => (r.ok ? setData(r.data) : setErr(r.error)))
      .catch(() => setErr('Calendario non disponibile.'));
  }, []);

  const delGiorno = useMemo(
    () => (data?.appuntamenti ?? []).filter((a) => giornoKey(new Date(a.inizio)) === giorno),
    [data, giorno]
  );
  const barbieri = (data?.barbieri ?? []).filter((b) => b.attivo);

  return (
    <div className="es-cal">
      <header className="el-pagehead es-cal__head">
        <h2>Calendario</h2>
        <div className="el-switch" role="group" aria-label="Vista">
          <button type="button" aria-pressed={vista === 'agenda'} onClick={() => setVista('agenda')}>Agenda</button>
          <button type="button" aria-pressed={vista === 'impostazioni'} onClick={() => setVista('impostazioni')}>Impostazioni del calendario</button>
        </div>
      </header>
      <p className="es-note">Collegato alle prenotazioni del sito: ciò che i clienti prenotano compare qui, e Eliseo manda i clienti a prenotare negli orari liberi.</p>
      {err && <p className="es-note es-note--box">{err}</p>}
      {!data && !err && <p className="es-note">Carico il calendario…</p>}

      {data && vista === 'agenda' && (
        <>
          <div className="es-days es-days--wide" role="tablist" aria-label="Giorno">
            {giorni.map((d) => {
              const k = giornoKey(d);
              const n = data.appuntamenti.filter((a) => giornoKey(new Date(a.inizio)) === k).length;
              return (
                <button key={k} type="button" role="tab" aria-pressed={giorno === k} aria-selected={giorno === k} onClick={() => setGiorno(k)}>
                  {d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', timeZone: 'Europe/Rome' })}
                  {n > 0 && <b>{n}</b>}
                </button>
              );
            })}
          </div>
          <div className="es-cal__cols" style={{ gridTemplateColumns: `repeat(${Math.max(1, barbieri.length)}, minmax(200px, 1fr))` }}>
            {barbieri.map((b) => {
              const list = delGiorno.filter((a) => a.barbiere === b.id);
              return (
                <section key={b.id} className="es-cal__col">
                  <h3>{b.nome}<span>{list.length} appuntamenti</span></h3>
                  {list.length === 0 && <p className="es-note">Libero.</p>}
                  {list.map((a) => (
                    <article key={a.id} className={`es-cal__app is-${a.stato}`}>
                      <time>{ora(a.inizio)}–{ora(a.fine)}</time>
                      <strong>{a.cliente}</strong>
                      <span>{a.servizio}</span>
                    </article>
                  ))}
                </section>
              );
            })}
          </div>
          <div className="es-inline">
            <Link href="/admin/prenotazioni" className="btn btn--primary">Gestisci le prenotazioni</Link>
            <a href={prenotaUrl} target="_blank" rel="noopener noreferrer" className="btn btn--secondary"><ExternalLink size={14} /> Pagina di prenotazione</a>
          </div>
        </>
      )}

      {data && vista === 'impostazioni' && (
        <div className="es-cal__set">
          <section className="es-block">
            <h3 className="es-h3"><Users size={16} /> Calendari</h3>
            <p className="es-note">Un calendario per ogni barbiere.</p>
            <ul className="es-list">
              {data.barbieri.map((b) => (
                <li key={b.id}><span><strong>{b.nome}</strong> · {b.ruolo}</span><span className={`pchip ${b.attivo ? 'pchip--ok' : 'pchip--wait'}`}>{b.attivo ? 'Prenotabile' : 'Non attivo'}</span></li>
              ))}
            </ul>
            <Link href="/admin/staff" className="link-button">Modifica barbieri e turni</Link>
          </section>
          <section className="es-block">
            <h3 className="es-h3"><Clock size={16} /> Fasce orarie e disponibilità</h3>
            <ul className="es-list">
              {data.orari.map((o) => <li key={o.giorno}><span>{o.giorno}</span><span>{o.orario}</span></li>)}
            </ul>
          </section>
          <section className="es-block">
            <h3 className="es-h3"><Scissors size={16} /> Tipi di appuntamento</h3>
            <p className="es-note">I servizi che i clienti possono prenotare.</p>
            <ul className="es-list">
              {data.servizi.map((s) => (
                <li key={s.id}><span><strong>{s.nome}</strong> · {s.minuti} min</span><span>{s.attivo ? euro(s.prezzo) : 'Non prenotabile'}</span></li>
              ))}
            </ul>
            <Link href="/admin/servizi" className="link-button">Modifica i servizi</Link>
          </section>
          <section className="es-block">
            <h3 className="es-h3"><CalendarDays size={16} /> Prenotazioni tramite Eliseo</h3>
            <p className="es-note">Quando un cliente chiede un appuntamento in chat, Eliseo lo manda alla pagina di prenotazione con gli orari liberi in tempo reale.</p>
          </section>
        </div>
      )}
    </div>
  );
}
