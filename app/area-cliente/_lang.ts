import { cookies } from 'next/headers';
import { isLang, LANG_COOKIE, type Lang } from '@/lib/i18n';

/** Lingua dell'area cliente: cookie `gb_lang` (default italiano). L'area è già dinamica (login). */
export async function getCustomerLang(): Promise<Lang> {
  const value = (await cookies()).get(LANG_COOKIE)?.value;
  return isLang(value) ? value : 'it';
}
