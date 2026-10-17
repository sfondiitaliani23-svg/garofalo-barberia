/** Toglie le emoji da un testo (le risposte dell'IA non devono averne: il sito usa le sue icone). */
const KEEP = new Set(['✓', '✔', '✕', '✖', '★', '☆', '×', '✦']);

function isEmoji(ch: string) {
  if (KEEP.has(ch)) return false;
  const cp = ch.codePointAt(0) ?? 0;
  return (
    (cp >= 0x1f300 && cp <= 0x1faff) ||
    (cp >= 0x2600 && cp <= 0x27bf) ||
    cp === 0x2b50 ||
    cp === 0x2b06 ||
    (cp >= 0x231a && cp <= 0x23ff)
  );
}

export function stripEmoji(text: string): string {
  let out = '';
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0;
    if (isEmoji(ch) || cp === 0xfe0f || cp === 0x200d || (cp >= 0x1f3fb && cp <= 0x1f3ff)) continue;
    out += ch;
  }
  return out.replace(/[ \t]{2,}/g, ' ').replace(/ +([.,!?;:])/g, '$1').replace(/[ \t]+\n/g, '\n').trim();
}
