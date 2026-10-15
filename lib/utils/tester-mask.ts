/**
 * Modalità tester: chi guarda il sito come tester vede tutte le schermate dell'admin,
 * ma i dati personali dei clienti (nome, telefono, email, note, foto) vengono nascosti
 * PRIMA di uscire dal server. Il browser del tester non li riceve mai.
 */

const NAME_KEYS = new Set(['customer_name', 'customerName', 'guest_name', 'full_name']);
const PHONE_KEYS = new Set(['customer_phone', 'customerPhone', 'phone']);
const EMAIL_KEYS = new Set(['customer_email', 'customerEmail', 'email']);
const TEXT_KEYS = new Set(['notes', 'personal_notes', 'hair_preferences', 'link']);
const NULL_KEYS = new Set(['avatar_url']);

const HIDDEN = '•••';

function label(value: string): string {
  let h = 0;
  for (const c of value) h = (h * 31 + c.charCodeAt(0)) % 997;
  return `Cliente ${String(h).padStart(3, '0')}`;
}

function maskString(key: string, value: string, extra: Set<string>): string {
  if (!value) return value;
  if (NAME_KEYS.has(key) || extra.has(key)) return label(value);
  if (PHONE_KEYS.has(key)) return '+39 ••• ••• ••••';
  if (EMAIL_KEYS.has(key)) return '••••@••••';
  if (TEXT_KEYS.has(key)) return HIDDEN;
  if (key === 'url' && /wa\.me|whatsapp|tel:|mailto:/i.test(value)) return '#';
  return value;
}

/** Copia dei dati con i dati personali nascosti. `extraNameKeys`: altri campi che qui contengono nomi o testi dei clienti. */
export function maskForTester<T>(data: T, extraNameKeys: string[] = []): T {
  const extra = new Set(extraNameKeys);
  const walk = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
        if (NULL_KEYS.has(k) && val) out[k] = null;
        else if (typeof val === 'string') out[k] = maskString(k, val, extra);
        else out[k] = walk(val);
      }
      return out;
    }
    return v;
  };
  return walk(data) as T;
}
