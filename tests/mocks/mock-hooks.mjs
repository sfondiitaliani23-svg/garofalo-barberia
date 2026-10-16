import { fileURLToPath, pathToFileURL } from 'node:url';
import { join, dirname } from 'node:path';
const here = dirname(fileURLToPath(import.meta.url));
const map = {
  '@/lib/supabase/server': 'supabase-server.mjs',
  'next/cache': 'next-cache.mjs',
  '@/lib/auth': 'auth.mjs',
  '@/lib/auth/ensure-profile': 'noop.mjs',
  '@/lib/utils/notifications': 'noop.mjs',
  '@/lib/utils/reminders': 'noop.mjs',
  resend: 'resend.mjs',
};
export function resolve(specifier, context, next) {
  const f = map[specifier];
  if (f) return { url: pathToFileURL(join(here, f)).href, shortCircuit: true };
  return next(specifier, context);
}
