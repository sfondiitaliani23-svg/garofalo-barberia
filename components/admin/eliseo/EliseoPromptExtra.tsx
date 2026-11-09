'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { TrainingPrompt } from '@/lib/utils/eliseo-training';
import './eliseo-settings.css';

// Più prompt oltre al principale (09/11/2026): in Keplero c'è un solo testo da 10.000 caratteri.
// Qui fino a 10 prompt in più, ciascuno da 10.000 caratteri, accesi o spenti uno per uno.

const MAX = 10;
const MAX_CHARS = 10000;

export function EliseoPromptExtra({ value, onSave, tester }: { value: TrainingPrompt[]; onSave: (next: TrainingPrompt[]) => Promise<boolean>; tester: boolean }) {
  const [list, setList] = useState<TrainingPrompt[]>(value);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => { setList(value); }, [value]);

  const dirty = JSON.stringify(list) !== JSON.stringify(value);

  async function salva() {
    setSaving(true);
    const ok = await onSave(list);
    setSaving(false);
    setMsg(ok ? 'Prompt salvati. Eliseo li usa entro un minuto.' : 'Salvataggio non riuscito.');
    setTimeout(() => setMsg(null), 5000);
  }

  return (
    <section className="es-block">
      <h3 className="es-h3">Prompt aggiuntivi</h3>
      <p className="es-note">
        Quando il principale è pieno, continua qui. Esempi: «Abbonamenti», «Prodotti», «Campagne». Fino a {MAX} prompt da 10.000 caratteri.
      </p>
      {list.map((p, i) => (
        <div key={i} className="es-prompt">
          <div className="es-prompt__bar">
            <input
              className="es-input"
              aria-label={`Nome del prompt ${i + 2}`}
              value={p.titolo}
              maxLength={80}
              disabled={tester}
              onChange={(e) => setList(list.map((x, j) => (j === i ? { ...x, titolo: e.target.value } : x)))}
            />
            <span className="es-prompt__count">{p.testo.length} / 10.000</span>
            <button
              type="button"
              role="switch"
              aria-checked={p.attivo}
              aria-label={`Prompt «${p.titolo}» attivo`}
              className="es-switch"
              disabled={tester}
              onClick={() => setList(list.map((x, j) => (j === i ? { ...x, attivo: !x.attivo } : x)))}
            >
              <span />
            </button>
            <button type="button" className="es-icon" aria-label={`Elimina il prompt «${p.titolo}»`} disabled={tester} onClick={() => setList(list.filter((_, j) => j !== i))}>
              <Trash2 size={15} />
            </button>
          </div>
          <textarea
            className="el-prompt__text"
            rows={8}
            maxLength={MAX_CHARS}
            value={p.testo}
            disabled={tester}
            onChange={(e) => setList(list.map((x, j) => (j === i ? { ...x, testo: e.target.value } : x)))}
          />
        </div>
      ))}
      <div className="es-inline">
        <button
          type="button"
          className="btn btn--secondary"
          disabled={tester || list.length >= MAX}
          onClick={() => setList([...list, { titolo: `Prompt ${list.length + 2}`, testo: '', attivo: true }])}
        >
          <Plus size={14} /> Aggiungi prompt
        </button>
        <button type="button" className="btn btn--primary" disabled={tester || !dirty || saving} onClick={salva}>
          {saving ? 'Salvo…' : 'Salva prompt aggiuntivi'}
        </button>
        {msg && <span className="es-msg" role="status">{msg}</span>}
      </div>
    </section>
  );
}
