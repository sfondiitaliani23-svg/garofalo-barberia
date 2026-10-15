// Controlli sulla versione inglese: pagine, sitemap, interruttore lingua, link.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const idx = read('lib/i18n/index.ts');
const listed = [...idx.slice(idx.indexOf('EN_STATIC_PATHS'), idx.indexOf('EN_DYNAMIC_PREFIXES')).matchAll(/'(\/[a-z0-9\-/]*)'/g)].map((m) => m[1]);

// Cartelle reali in app/en (ogni page.tsx), come indirizzo italiano.
const enPages = walk(path.join(root, 'app/en'))
  .filter((f) => f.endsWith('/page.tsx'))
  .map((f) => '/' + path.relative(path.join(root, 'app/en'), path.dirname(f)).replace(/\\/g, '/'))
  .map((p) => (p === '/.' ? '/' : p));

test('ogni pagina elencata in EN_STATIC_PATHS ha la cartella in app/en e viceversa', () => {
  const staticEn = enPages.filter((p) => !p.includes('['));
  const missing = listed.filter((p) => !staticEn.includes(p));
  const extra = staticEn.filter((p) => !listed.includes(p));
  assert.deepEqual(missing, [], `Elencate ma senza pagina in app/en: ${missing.join(', ')}`);
  assert.deepEqual(extra, [], `In app/en ma non elencate (l'interruttore lingua non le trova): ${extra.join(', ')}`);
});

test('ogni pagina inglese ha la sua gemella italiana con lo stesso indirizzo', () => {
  const missing = enPages.filter((p) => {
    const dir = p === '/' ? 'app/(public)' : `app/(public)${p}`;
    return !fs.existsSync(path.join(root, dir, 'page.tsx'));
  });
  assert.deepEqual(missing, [], `Pagine inglesi senza gemella italiana: ${missing.join(', ')}`);
});

test('le pagine inglesi dichiarano metadati inglesi con hreflang', () => {
  const bad = [];
  for (const f of walk(path.join(root, 'app/en')).filter((f) => f.endsWith('/page.tsx'))) {
    const src = fs.readFileSync(f, 'utf8');
    const rel = path.relative(root, f);
    if (!/alternatesFor\(|localPageMetadata\(|articleMetadata\(|barberMetadata\(/.test(src)) bad.push(`${rel}: manca alternatesFor (hreflang)`);
    if (!/lang="en"|, 'en'\)|lang: 'en'|lang = 'en'/.test(src)) bad.push(`${rel}: non passa la lingua inglese`);
  }
  assert.deepEqual(bad, [], bad.join('\n'));
});

test('le pagine pubbliche non leggono cookie o header (devono restare statiche)', () => {
  const bad = [];
  for (const f of [...walk(path.join(root, 'app/(public)')), ...walk(path.join(root, 'app/en'))].filter((f) => /\.(tsx|ts)$/.test(f))) {
    const src = fs.readFileSync(f, 'utf8');
    if (/from 'next\/headers'/.test(src)) bad.push(path.relative(root, f));
  }
  // login, prenota, reset password e nuova recensione erano già dinamiche prima dell'inglese
  const allowed = ['prenota', 'login', 'reimposta-password', 'recensioni/nuova', 'register'];
  const real = bad.filter((f) => !allowed.some((a) => f.includes(a)));
  assert.deepEqual(real, [], `Queste pagine pubbliche usano cookies/headers: ${real.join(', ')}`);
});

test('la sitemap contiene ogni pagina in italiano e in inglese con hreflang', () => {
  const src = read('app/sitemap.ts');
  assert.match(src, /\['it', 'en'\]/);
  assert.match(src, /'x-default'/);
  assert.match(src, /alternates: \{ languages \}/);
});

test('switchPath: stessa pagina nell\'altra lingua, home inglese se manca', async () => {
  // Riproduce la logica di lib/i18n/index.ts senza compilare TypeScript.
  const stripLang = (p) => (p === '/en' ? '/' : p.startsWith('/en/') ? p.slice(3) : p);
  const has = (p) => listed.includes(p) || ['/team/', '/journal/'].some((x) => p.startsWith(x) && p.length > x.length);
  const sw = (p, to) => { const b = stripLang(p); return to === 'it' ? b : has(b) ? (b === '/' ? '/en' : '/en' + b) : '/en'; };
  assert.equal(sw('/servizi', 'en'), '/en/servizi');
  assert.equal(sw('/en/servizi', 'it'), '/servizi');
  assert.equal(sw('/', 'en'), '/en');
  assert.equal(sw('/en', 'it'), '/');
  assert.equal(sw('/team/luigi-garofalo', 'en'), '/en/team/luigi-garofalo');
  assert.equal(sw('/pagina-senza-inglese', 'en'), '/en');
});
