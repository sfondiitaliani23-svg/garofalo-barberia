// Ricarica la scheda quando il sito pubblicato cambia. Un modulo già toccato resta com'è.
const KEY = 'garofalo-rev';

function busy() {
  const el = document.activeElement;
  if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return true;
  if (document.querySelector('dialog[open], [role="dialog"][data-state="open"]')) return true;
  for (const field of document.querySelectorAll('input, textarea, select')) {
    if (field instanceof HTMLInputElement) {
      const t = field.type;
      if (t === 'hidden' || t === 'button' || t === 'submit') continue;
      if (t === 'checkbox' || t === 'radio') {
        if (field.checked !== field.defaultChecked) return true;
        continue;
      }
      if (field.value !== field.defaultValue) return true;
    } else if (field instanceof HTMLTextAreaElement) {
      if (field.value !== field.defaultValue) return true;
    } else if (field instanceof HTMLSelectElement) {
      if ([...field.options].some((option) => option.selected !== option.defaultSelected)) return true;
    }
  }
  return false;
}

function readSeen() {
  try { return sessionStorage.getItem(KEY) || ''; } catch { return ''; }
}

function storeSeen(rev) {
  try { sessionStorage.setItem(KEY, rev); } catch { /* la scheda resta aperta */ }
}

function stripMarker() {
  const cur = new URL(location.href);
  if (!cur.searchParams.has('aggiornato')) return;
  cur.searchParams.delete('aggiornato');
  const query = cur.searchParams.toString();
  history.replaceState(null, '', cur.pathname + (query ? `?${query}` : '') + cur.hash);
}

async function revision() {
  const res = await fetch('/api/live-rev', { cache: 'no-store' });
  if (!res.ok) return '';
  const text = (await res.text()).trim();
  if (/^dpl_[A-Za-z0-9]+$/.test(text) || /^[0-9a-f]{7,40}$/.test(text)) return text;
  return '';
}

async function watch() {
  let rev = '';
  try { rev = await revision(); } catch { return; }
  if (!rev) return;
  const seen = readSeen();
  if (!seen || seen === rev || seen === `done:${rev}`) {
    if (seen !== rev) storeSeen(rev);
    return;
  }
  if (busy()) return;
  storeSeen(`done:${rev}`);
  const next = new URL(location.href);
  next.searchParams.set('aggiornato', rev.slice(-8));
  location.replace(next.pathname + next.search + next.hash);
}

function start() {
  stripMarker();
  watch();
  setInterval(watch, 15000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) watch(); });
  addEventListener('focus', watch);
}

if (document.readyState === 'complete') start();
else addEventListener('load', start, { once: true });
