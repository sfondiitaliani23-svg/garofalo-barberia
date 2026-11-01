/**
 * Toglie email e numeri di telefono da un testo prima di mandarlo all'IA esterna.
 * La risposta non cambia (l'assistente non deve usare questi dati), ma escono meno dati dei clienti.
 * Gli orari (14:30), le date (12/11) e i prezzi (25 €) restano: un numero di telefono ha almeno 8 cifre.
 */
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
// + o 00 facoltativi, poi cifre con spazi, punti, trattini o parentesi in mezzo.
const PHONE = /(?:\+|\b00)?\d[\d\s().-]{6,}\d/g;

export function redactContacts(text: string, lang: 'it' | 'en' = 'it'): string {
  if (!text) return text;
  const tel = lang === 'en' ? '[phone]' : '[telefono]';
  return text
    .replace(EMAIL, '[email]')
    .replace(PHONE, (m) => (m.replace(/\D/g, '').length >= 8 ? tel : m));
}
