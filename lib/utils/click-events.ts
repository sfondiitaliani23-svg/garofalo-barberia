/** Clic importanti che contiamo (nessun dato personale: solo nome, pagina, giorno). */
export const CLICK_EVENTS = {
  prenota: 'Prenota',
  whatsapp: 'WhatsApp',
  chiama: 'Chiama',
  mappa: 'Come arrivare',
  instagram: 'Instagram',
  recensione_google: 'Recensione Google',
  assistente: 'Assistente Eliseo',
} as const;

export type ClickEvent = keyof typeof CLICK_EVENTS;

/** Riconosce il clic dal link toccato. */
export function eventFromHref(href: string): ClickEvent | null {
  const h = href.toLowerCase();
  if (h.startsWith('tel:')) return 'chiama';
  if (h.includes('wa.me/') || h.includes('api.whatsapp.com') || h.includes('whatsapp://')) return 'whatsapp';
  if (h.includes('search.google.com/local/writereview') || h.includes('g.page/')) return 'recensione_google';
  if (h.includes('maps.google.') || h.includes('google.com/maps') || h.includes('goo.gl/maps') || h.includes('maps.app.goo.gl')) return 'mappa';
  if (h.includes('instagram.com')) return 'instagram';
  try {
    const u = new URL(href, 'https://barberiagarofalo.it');
    if (u.hostname.endsWith('barberiagarofalo.it') && u.pathname.startsWith('/prenota')) return 'prenota';
  } catch {
    /* link non valido */
  }
  return null;
}
