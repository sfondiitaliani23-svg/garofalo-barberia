export function normalizeItalianPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;

  if (digits.startsWith('39') && digits.length >= 11) return digits;
  if (digits.startsWith('0') && digits.length >= 9) return `39${digits.slice(1)}`;
  if (digits.length === 9 || digits.length === 10) return `39${digits}`;

  return digits.length >= 9 ? digits : null;
}
/**
 * Traduce le risposte di errore di Green API in un messaggio chiaro.
 * Il caso più comune: piano gratuito "Developer" limitato a 3 contatti al mese.
 */
export function describeGreenApiError(raw: string): { quota: boolean; message: string } {
  const text = raw ?? '';
  if (/QUOTE_EXCEEDED|CORRESPONDENTS_QUOTE|quota has been exceeded/i.test(text)) {
    const allowed = Array.from(new Set(text.match(/\d{8,15}(?=@c\.us)/g) ?? []));
    return {
      quota: true,
      message:
        'Quota del piano gratuito Green API esaurita: questo mese WhatsApp può scrivere solo a ' +
        (allowed.length ? allowed.map((n) => `+${n}`).join(', ') : '3 numeri') +
        '. Per inviare a tutti i clienti passa al piano Business su console.green-api.com.',
    };
  }
  if (/notAuthorized|not authorized/i.test(text)) {
    return { quota: false, message: 'WhatsApp del salone non collegato: ricollegalo con il QR.' };
  }
  return { quota: false, message: 'Invio non riuscito. Riprova tra poco.' };
}
