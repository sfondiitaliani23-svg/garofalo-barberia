export function normalizeItalianPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;

  if (digits.startsWith('39') && digits.length >= 11) return digits;
  if (digits.startsWith('0') && digits.length >= 9) return `39${digits.slice(1)}`;
  if (digits.length === 9 || digits.length === 10) return `39${digits}`;

  return digits.length >= 9 ? digits : null;
}