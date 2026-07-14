#!/usr/bin/env node
/**
 * Aggiorna chiusure salone (barber_time_off con barber_id null) e banner sito.
 */
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { parseISO } from 'date-fns';
import { createClient } from '@supabase/supabase-js';

const envPath = resolve(process.cwd(), '.env.local');
if (!existsSync(envPath)) {
  console.error('❌ .env.local non trovato');
  process.exit(1);
}

for (const line of readFileSync(envPath, 'utf8').replace(/^\uFEFF/, '').split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq === -1) continue;
  const key = trimmed.slice(0, eq).trim();
  const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
  if (!process.env[key]) process.env[key] = value;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('❌ Variabili Supabase mancanti');
  process.exit(1);
}

const supabase = createClient(url, key);

const CLOSURES = [
  {
    label: 'Ferie correnti',
    startDate: '2026-07-11',
    endDate: '2026-07-13',
    reason: 'Ferie',
    matchReason: /ferie/i,
    matchEndBefore: '2026-07-20',
  },
  {
    label: 'Ferie agosto',
    startDate: '2026-08-13',
    endDate: '2026-08-19',
    reason: 'Ferie',
    matchStart: '2026-08-13',
    matchEnd: '2026-08-19',
  },
];

function dayBounds(startDate, endDate) {
  return {
    start_at: parseISO(`${startDate}T00:00:00`).toISOString(),
    end_at: parseISO(`${endDate}T23:59:59`).toISOString(),
  };
}

async function listSalonClosures() {
  const { data, error } = await supabase
    .from('barber_time_off')
    .select('id, barber_id, start_at, end_at, reason, created_at')
    .is('barber_id', null)
    .order('start_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

function romeDate(iso) {
  if (!iso) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
}

function matchesClosure(row, spec) {
  const start = romeDate(row.start_at);
  const end = romeDate(row.end_at);

  if (spec.matchStart && spec.matchEnd) {
    return start === spec.matchStart && end === spec.matchEnd;
  }

  if (spec.matchEndBefore && end <= spec.matchEndBefore) {
    if (spec.matchReason && !spec.matchReason.test(row.reason ?? '')) return false;
    return start >= '2026-07-01' && end <= spec.endDate;
  }

  return false;
}

async function upsertSalonClosure(spec) {
  const bounds = dayBounds(spec.startDate, spec.endDate);
  const existing = (await listSalonClosures()).find((row) => matchesClosure(row, spec));

  if (existing) {
    const { error } = await supabase
      .from('barber_time_off')
      .update({
        start_at: bounds.start_at,
        end_at: bounds.end_at,
        reason: spec.reason,
      })
      .eq('id', existing.id);

    if (error) throw error;
    console.log(`✅ Aggiornata: ${spec.label} (${spec.startDate} → ${spec.endDate}) [${existing.id}]`);
    return existing.id;
  }

  const { data, error } = await supabase
    .from('barber_time_off')
    .insert({
      barber_id: null,
      start_at: bounds.start_at,
      end_at: bounds.end_at,
      reason: spec.reason,
    })
    .select('id')
    .single();

  if (error) throw error;
  console.log(`✅ Creata: ${spec.label} (${spec.startDate} → ${spec.endDate}) [${data.id}]`);
  return data.id;
}

async function upsertBanner({
  key,
  title,
  body,
  is_active,
  starts_at,
  ends_at,
}) {
  const { data: existing } = await supabase.from('site_content').select('id').eq('key', key).maybeSingle();

  const payload = {
    key,
    title,
    body,
    is_active,
    starts_at,
    ends_at,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const { error } = await supabase.from('site_content').update(payload).eq('id', existing.id);
    if (error) throw error;
    console.log(`✅ Banner aggiornato: ${key}`);
    return;
  }

  const { error } = await supabase.from('site_content').insert(payload);
  if (error) throw error;
  console.log(`✅ Banner creato: ${key}`);
}

async function main() {
  console.log('Chiusure salone attuali:');
  for (const row of await listSalonClosures()) {
    console.log(`  - ${romeDate(row.start_at)} → ${romeDate(row.end_at)} | ${row.reason ?? '—'} | ${row.id}`);
  }

  for (const spec of CLOSURES) {
    await upsertSalonClosure(spec);
  }

  await upsertBanner({
    key: 'closure_banner',
    title: 'Chiusura per ferie',
    body: 'La barberia è chiusa per ferie fino al 13 luglio 2026. Ci rivediamo dal 14 luglio!',
    is_active: true,
    starts_at: parseISO('2026-07-11T00:00:00').toISOString(),
    ends_at: parseISO('2026-07-13T23:59:59').toISOString(),
  });

  await upsertBanner({
    key: 'closure_banner_august',
    title: 'Chiusura estiva',
    body: 'Siamo chiusi per ferie dal 13 al 19 agosto 2026. Prenota prima o dopo questo periodo.',
    is_active: true,
    starts_at: parseISO('2026-08-13T00:00:00').toISOString(),
    ends_at: parseISO('2026-08-19T23:59:59').toISOString(),
  });

  console.log('\nChiusure salone finali:');
  for (const row of await listSalonClosures()) {
    console.log(`  - ${romeDate(row.start_at)} → ${romeDate(row.end_at)} | ${row.reason ?? '—'}`);
  }
}

main().catch((err) => {
  console.error('❌', err.message ?? err);
  process.exit(1);
});