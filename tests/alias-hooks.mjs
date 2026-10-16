// Fa capire a Node gli indirizzi "@/..." del sito (come in tsconfig), così i test possono importare i file di lib/.
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join, dirname } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

export function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    const base = join(root, specifier.slice(2));
    for (const candidate of [`${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), base]) {
      if (existsSync(candidate) && !candidate.endsWith('/') && /\.(ts|tsx|mjs|js)$/.test(candidate)) {
        return nextResolve(pathToFileURL(candidate).href, context);
      }
    }
  }
  return nextResolve(specifier, context);
}
