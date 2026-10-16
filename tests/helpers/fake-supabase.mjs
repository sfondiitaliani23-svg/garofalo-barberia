// Finto "Supabase" per i test: parla con un vero Postgres (PGlite, in memoria) e imita le chiamate usate dal sito.
import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MIGRATIONS = [
  '001_initial_schema.sql',
  '002_barber_availability_periods.sql',
  '003_appointment_reminders.sql',
  '004_promotions.sql',
  '007_fix_availability_periods.sql',
];

export async function createTestDb() {
  const db = new PGlite({ extensions: { btree_gist } });
  await db.exec(`
    create schema auth;
    create table auth.users(id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb);
    create function auth.uid() returns uuid language sql as $$ select null::uuid $$;
    create function auth.role() returns text language sql as $$ select 'service_role'::text $$;
  `);
  for (const f of MIGRATIONS) {
    await db.exec(readFileSync(join(root, 'supabase', 'migrations', f), 'utf8'));
  }
  return db;
}

function normalize(v) {
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return v.map(normalize);
  return v;
}
const normRow = (r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, normalize(v)]));
const q = (c) => `"${c.replace(/"/g, '')}"`;

class Query {
  constructor(db, table) {
    this.db = db; this.table = table; this.op = 'select'; this.cols = '*';
    this.where = []; this.params = []; this.orderBy = []; this.lim = null; this.mode = 'many'; this.payload = null; this.returning = false;
  }
  select(cols = '*') {
    if (this.op === 'select') this.cols = cols.includes('(') ? '*' : cols;
    else this.returning = true;
    return this;
  }
  insert(p) { this.op = 'insert'; this.payload = p; return this; }
  update(p) { this.op = 'update'; this.payload = p; return this; }
  delete() { this.op = 'delete'; return this; }
  _f(sql, ...vals) { const idx = vals.map((v) => { this.params.push(v); return `$${this.params.length}`; }); this.where.push(sql(...idx)); return this; }
  eq(c, v) { return this._f((a) => `${q(c)} = ${a}`, v); }
  neq(c, v) { return this._f((a) => `${q(c)} <> ${a}`, v); }
  gte(c, v) { return this._f((a) => `${q(c)} >= ${a}`, v); }
  gt(c, v) { return this._f((a) => `${q(c)} > ${a}`, v); }
  lte(c, v) { return this._f((a) => `${q(c)} <= ${a}`, v); }
  lt(c, v) { return this._f((a) => `${q(c)} < ${a}`, v); }
  like(c, v) { return this._f((a) => `${q(c)} like ${a}`, v); }
  ilike(c, v) { return this._f((a) => `${q(c)} ilike ${a}`, v); }
  is(c, v) { this.where.push(v === null ? `${q(c)} is null` : `${q(c)} is ${v ? 'true' : 'false'}`); return this; }
  in(c, arr) { return this._f((a) => `${q(c)}::text = any(${a}::text[])`, arr.map(String)); }
  order(c, o = {}) { this.orderBy.push(`${q(c)} ${o.ascending === false ? 'desc' : 'asc'}`); return this; }
  limit(n) { this.lim = n; return this; }
  single() { this.mode = 'single'; return this; }
  maybeSingle() { this.mode = 'maybe'; return this; }
  then(res, rej) { return this._run().then(res, rej); }
  async _run() {
    try {
      const w = this.where.length ? ` where ${this.where.join(' and ')}` : '';
      let sql; let rows;
      if (this.op === 'select') {
        const cols = this.cols === '*' ? '*' : this.cols.split(',').map((c) => q(c.trim())).join(', ');
        sql = `select ${cols} from ${this.table}${w}${this.orderBy.length ? ` order by ${this.orderBy.join(', ')}` : ''}${this.lim != null ? ` limit ${this.lim}` : ''}`;
        rows = (await this.db.query(sql, this.params)).rows;
      } else if (this.op === 'insert') {
        const list = Array.isArray(this.payload) ? this.payload : [this.payload];
        const keys = [...new Set(list.flatMap((o) => Object.keys(o)))];
        const vals = [];
        const tuples = list.map((o) => `(${keys.map((k) => { vals.push(o[k] ?? null); return `$${vals.length}`; }).join(', ')})`);
        sql = `insert into ${this.table} (${keys.map(q).join(', ')}) values ${tuples.join(', ')} returning *`;
        rows = (await this.db.query(sql, vals)).rows;
      } else if (this.op === 'update') {
        const keys = Object.keys(this.payload);
        const sets = keys.map((k) => { this.params.push(this.payload[k]); return `${q(k)} = $${this.params.length}`; });
        sql = `update ${this.table} set ${sets.join(', ')}${w} returning *`;
        rows = (await this.db.query(sql, this.params)).rows;
      } else {
        sql = `delete from ${this.table}${w} returning *`;
        rows = (await this.db.query(sql, this.params)).rows;
      }
      rows = rows.map(normRow);
      if (this.op !== 'select' && !this.returning) rows = [];
      if (this.mode === 'single') {
        if (rows.length !== 1) return { data: null, error: { code: 'PGRST116', message: 'Expected one row' } };
        return { data: rows[0], error: null };
      }
      if (this.mode === 'maybe') return { data: rows[0] ?? null, error: null };
      return { data: rows, error: null };
    } catch (e) {
      return { data: null, error: { code: e.code ?? 'XX000', message: e.message } };
    }
  }
}

export function fakeSupabase(db) {
  return { from: (table) => new Query(db, table), auth: { getUser: async () => ({ data: { user: null }, error: null }) } };
}

// Dati base: 3 barbieri, servizi, orari come in negozio (mar–ven 08:30–13:00 e 15:30–20:30; sab 08:30–14:00 e 14:30–20:00).
export async function seedShop(db) {
  const ids = {};
  for (const [i, name] of ['Luigi Garofalo', 'Francesco Costantino', 'Vittorio Morlino'].entries()) {
    const r = await db.query(`insert into barbers(name, sort_order) values ($1, $2) returning id`, [name, i + 1]);
    ids[name.split(' ')[0].toLowerCase()] = r.rows[0].id;
  }
  const svc = [
    ['Taglio e shampoo', 'taglio', 2000, 30],
    ['Taglio baby', 'baby', 1500, 30],
    ['Barba', 'barba', 1000, 20],
    ['Styling', 'styling', 800, 15],
  ];
  for (const [name, cat, price, dur] of svc) {
    const r = await db.query(`insert into services(name, category, price_cents, duration_minutes) values ($1, $2::service_category, $3, $4) returning id`, [name, cat, price, dur]);
    ids[name.toLowerCase().replace(/ /g, '_')] = r.rows[0].id;
  }
  await db.query(`delete from barber_availability`);
  const periods = (dow) => dow === 6
    ? [['08:30', '14:00', 'morning'], ['14:30', '20:00', 'afternoon']]
    : [['08:30', '13:00', 'morning'], ['15:30', '20:30', 'afternoon']];
  for (const b of ['luigi', 'francesco', 'vittorio']) {
    for (const dow of [2, 3, 4, 5, 6]) {
      for (const [s, e, p] of periods(dow)) {
        await db.query(`insert into barber_availability(barber_id, day_of_week, start_time, end_time, is_available, period) values ($1,$2,$3,$4,true,$5)`, [ids[b], dow, s, e, p]);
      }
    }
  }
  return ids;
}
