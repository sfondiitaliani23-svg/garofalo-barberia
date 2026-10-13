import type { JournalBlock } from '@/lib/data/journal';

/**
 * Testo semplice <-> blocchi dell'articolo.
 *   ## Titoletto
 *   - punto elenco
 *   > consiglio (riquadro)
 *   riga vuota = nuovo paragrafo
 */
export function textToBlocks(text: string): JournalBlock[] {
  const blocks: JournalBlock[] = [];
  const paras = text.replace(/\r\n/g, '\n').split(/\n\s*\n/);
  for (const raw of paras) {
    const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    let buf: string[] = [];
    let list: string[] = [];
    const flushP = () => {
      if (buf.length) blocks.push({ type: 'p', text: buf.join(' ') });
      buf = [];
    };
    const flushL = () => {
      if (list.length) blocks.push({ type: 'list', items: list });
      list = [];
    };
    for (const l of lines) {
      if (l.startsWith('## ')) {
        flushP(); flushL();
        blocks.push({ type: 'h2', text: l.slice(3).trim() });
      } else if (/^[-•*] /.test(l)) {
        flushP();
        list.push(l.slice(2).trim());
      } else if (l.startsWith('> ')) {
        flushP(); flushL();
        blocks.push({ type: 'tip', text: l.slice(2).trim() });
      } else {
        flushL();
        buf.push(l);
      }
    }
    flushP(); flushL();
  }
  return blocks;
}

export function blocksToText(blocks: JournalBlock[]): string {
  return blocks
    .map((b) => {
      if (b.type === 'h2') return `## ${b.text}`;
      if (b.type === 'list') return b.items.map((i) => `- ${i}`).join('\n');
      if (b.type === 'tip') return `> ${b.text}`;
      return b.text;
    })
    .join('\n\n');
}

export function readMinutes(blocks: JournalBlock[]) {
  const words = blocks
    .map((b) => (b.type === 'list' ? b.items.join(' ') : b.text))
    .join(' ')
    .split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

export function slugify(title: string) {
  return title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 70);
}
