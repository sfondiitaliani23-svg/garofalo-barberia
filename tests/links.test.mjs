// Controllo link interni: ogni link a una pagina del sito deve portare a una rotta che esiste.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.next')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

// Rotte reali: app/**/page.tsx e route.ts, senza i gruppi "(x)".
const routes = [];
for (const f of walk(path.join(root, 'app'))) {
  const rel = path.relative(path.join(root, 'app'), f).replace(/\\/g, '/');
  if (!/(^|\/)(page\.tsx|route\.ts)$/.test(rel)) {
    if (/^(llms\.txt)$/.test(rel)) routes.push('/llms.txt');
    continue;
  }
  const dir = rel.replace(/(^|\/)(page\.tsx|route\.ts)$/, '');
  const url = '/' + dir.split('/').filter((s) => s && !/^\(.*\)$/.test(s)).join('/');
  routes.push(url === '/' ? '/' : url.replace(/\/$/, ''));
}
// Icone di Next: app/icon.png, app/apple-icon.png, app/favicon.ico sono servite dalla radice.
for (const f of fs.readdirSync(path.join(root, 'app'))) {
  if (/\.(png|ico|jpg|svg)$/.test(f)) routes.push('/' + f);
}
for (const f of ['robots.ts', 'sitemap.ts', 'manifest.ts']) {
  if (fs.existsSync(path.join(root, 'app', f))) routes.push('/' + f.replace('.ts', f === 'robots.ts' ? '.txt' : f === 'sitemap.ts' ? '.xml' : '.webmanifest'));
}
const publicFiles = new Set(
  walk(path.join(root, 'public')).map((f) => '/' + path.relative(path.join(root, 'public'), f).replace(/\\/g, '/')),
);

function exists(url) {
  const clean = url.split('#')[0].split('?')[0].replace(/(.)\/$/, '$1');
  if (!clean || clean === '/') return true;
  if (publicFiles.has(clean)) return true;
  const parts = clean.split('/');
  return routes.some((r) => {
    const rp = r.split('/');
    if (rp.length !== parts.length) return false;
    return rp.every((seg, i) => /^\[.+\]$/.test(seg) || seg === parts[i]);
  });
}

const re = /(?:href\s*=\s*\{?\s*|href\s*:\s*|redirect\(\s*|router\.(?:push|replace)\(\s*|revalidatePath\(\s*|url\s*:\s*|link\s*:\s*)[`'"](\/[^`'"\s${}]*)[`'"]/g;

test('i link interni portano a rotte o file che esistono', () => {
  const files = [...walk(path.join(root, 'app')), ...walk(path.join(root, 'components')), ...walk(path.join(root, 'lib'))].filter((f) => /\.(tsx?|mjs)$/.test(f));
  const broken = [];
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    let m;
    while ((m = re.exec(src))) {
      const url = m[1];
      if (url.startsWith('//')) continue;
      // revalidatePath('/x', 'layout') e simili usano a volte un modello: lo saltiamo se contiene [ ]
      if (url.includes('[')) continue;
      if (!exists(url)) broken.push(`${path.relative(root, f)} -> ${url}`);
    }
  }
  assert.deepEqual(broken, [], `Link a pagine che non esistono:\n${broken.join('\n')}`);
});

test('la sitemap elenca solo pagine pubbliche esistenti', () => {
  const src = fs.readFileSync(path.join(root, 'app/sitemap.ts'), 'utf8');
  const urls = [...src.matchAll(/['"`](\/[a-z0-9\-/]+)['"`]/g)].map((m) => m[1]);
  const bad = urls.filter((u) => !exists(u));
  assert.deepEqual(bad, [], `Nella sitemap ma senza pagina: ${bad.join(', ')}`);
});
