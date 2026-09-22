import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

const envPath = resolve(process.cwd(), '.env.local');
if (!existsSync(envPath)) { console.error('No .env.local'); process.exit(1); }

for (const line of readFileSync(envPath, 'utf8').replace(/^\uFEFF/, '').split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq === -1) continue;
  const k = trimmed.slice(0, eq).trim();
  const v = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
  if (!process.env[k]) process.env[k] = v;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) { console.error('Variabili Supabase mancanti'); process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

const HALF_DAYS = [
  { date: '2026-10-13', label: 'Martedi 13 Ottobre' },
  { date: '2026-10-14', label: 'Mercoledi 14 Ottobre' },
  { date: '2026-10-15', label: 'Giovedi 15 Ottobre' },
];

async function main() {
  const { data: barbers, error: barbersErr } = await supabase.from('barbers').select('id, name').eq('is_active', true);
  if (barbersErr) { console.error('Errore barbers:', barbersErr.message); process.exit(1); }

  const luigi = (barbers ?? []).find(b => b.name != null && b.name.toLowerCase().includes('luigi'));
  if (!luigi) { console.error('Luigi Garofalo non trovato'); process.exit(1); }
  console.log('Trovato:', luigi.name, '| ID:', luigi.id);

  const rangeStart = new Date('2026-10-13T00:00:00+02:00').toISOString();
  const rangeEnd   = new Date('2026-10-15T23:59:59+02:00').toISOString();

  const { data: existing } = await supabase.from('barber_time_off').select('id, start_at, end_at, reason').eq('barber_id', luigi.id).lte('start_at', rangeEnd).gte('end_at', rangeStart);
  if (existing && existing.length > 0) {
    console.log('\nBlocchi gia esistenti:');
    for (const r of existing) console.log(' -', r.start_at, '->', r.end_at, '|', r.reason ?? '', '|', r.id);
  }

  for (const day of HALF_DAYS) {
    const start_at = new Date(day.date + 'T15:30:00+02:00').toISOString();
    const end_at   = new Date(day.date + 'T23:59:59+02:00').toISOString();
    const dup = (existing ?? []).find(r => r.start_at.slice(0, 16) === start_at.slice(0, 16));
    if (dup) { console.log('Skip (gia presente):', day.label); continue; }
    const { data, error } = await supabase.from('barber_time_off').insert({ barber_id: luigi.id, start_at, end_at, reason: 'Mezza giornata (solo mattina)' }).select('id').single();
    if (error) console.error('ERRORE', day.label, error.message);
    else console.log('OK', day.label, '| ID:', data.id);
  }

  const { data: final } = await supabase.from('barber_time_off').select('id, start_at, end_at, reason').eq('barber_id', luigi.id).lte('start_at', rangeEnd).gte('end_at', rangeStart).order('start_at');
  console.log('\nBlocchi finali (13-15 Ottobre):');
  for (const r of (final ?? [])) {
    console.log(' -', new Date(r.start_at).toLocaleString('it-IT', { timeZone: 'Europe/Rome' }), '->', new Date(r.end_at).toLocaleString('it-IT', { timeZone: 'Europe/Rome' }), '|', r.reason ?? '');
  }
}

main().catch(e => { console.error(e.message ?? e); process.exit(1); });
