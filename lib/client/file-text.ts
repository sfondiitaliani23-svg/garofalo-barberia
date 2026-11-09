'use client';

// Testo dei file caricati in Eliseo → Addestramento → File (09/11/2026).
// Prima si salvava file.text() anche per PDF e Word: arrivava all'IA un testo illeggibile.
// Ora PDF (unpdf) e Word .docx (mammoth) si leggono nel browser; il file non lascia il computer, solo il testo.

export const MAX_DOC_CHARS = 20000;
export const MAX_FILE_BYTES = 30 * 1024 * 1024;

export async function extractTextFromFile(file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES) throw new Error(`«${file.name}» supera 30 MB.`);
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf') || file.type === 'application/pdf') {
    const { extractText, getDocumentProxy } = await import('unpdf');
    const pdf = await getDocumentProxy(new Uint8Array(await file.arrayBuffer()));
    const { text } = await extractText(pdf, { mergePages: true });
    return tidy(Array.isArray(text) ? text.join('\n\n') : text);
  }
  if (name.endsWith('.docx')) {
    const mammoth = (await import('mammoth')).default ?? (await import('mammoth'));
    const res = await (mammoth as { extractRawText: (o: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }> }).extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return tidy(res.value);
  }
  if (name.endsWith('.doc')) throw new Error(`«${file.name}»: il vecchio formato .doc non si legge. Salvalo come .docx o PDF.`);
  return tidy(await file.text());
}

export function tidy(s: string): string {
  return s
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Divide un testo lungo in parti da al massimo `max` caratteri, tagliando tra i paragrafi quando si può. */
export function splitText(text: string, max = MAX_DOC_CHARS): string[] {
  if (text.length <= max) return [text];
  const parts: string[] = [];
  let rest = text;
  while (rest.length > max) {
    let cut = rest.lastIndexOf('\n\n', max);
    if (cut < max * 0.5) cut = rest.lastIndexOf('\n', max);
    if (cut < max * 0.5) cut = rest.lastIndexOf(' ', max);
    if (cut < max * 0.5) cut = max;
    parts.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) parts.push(rest);
  return parts;
}
