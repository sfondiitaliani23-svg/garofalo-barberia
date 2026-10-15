/**
 * Traduzioni inglesi dei contenuti fissi nel codice (nomi servizi, giorni, orari).
 * I contenuti scritti dall'admin nel database restano in italiano se qui manca la traduzione:
 * serve solo a non mostrare mai un testo vuoto.
 */
import type { Lang } from './index';

const SERVICES_EN: Record<string, string> = {
  'Taglio e shampoo': 'Haircut & shampoo',
  'Taglio baby': 'Kids’ haircut',
  'Barba rasata / lama': 'Straight-razor shave',
  'Barba modellata a forbici': 'Beard trim with scissors',
  'Barba con panno caldo': 'Hot-towel beard',
  'Shampoo e acconciatura': 'Shampoo & styling',
};

export function serviceName(lang: Lang, name: string): string {
  return lang === 'en' ? (SERVICES_EN[name] ?? name) : name;
}

const DAYS_EN: Record<string, string> = {
  'Lunedì': 'Monday',
  'Martedì': 'Tuesday',
  'Mercoledì': 'Wednesday',
  'Giovedì': 'Thursday',
  'Venerdì': 'Friday',
  'Sabato': 'Saturday',
  'Domenica': 'Sunday',
  'Martedì – Venerdì': 'Tuesday – Friday',
};

export function dayName(lang: Lang, day: string): string {
  return lang === 'en' ? (DAYS_EN[day] ?? day) : day;
}

export function timeText(lang: Lang, time: string): string {
  return lang === 'en' && time === 'Chiuso' ? 'Closed' : time;
}
