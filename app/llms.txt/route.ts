import { SITE_CONFIG } from '@/lib/site-config';
import { SITE_URL } from '@/lib/seo';
import { getServices } from '@/lib/actions/bookings';
import { LOCAL_PAGES } from '@/lib/data/local-pages';
import { JOURNAL } from '@/lib/data/journal';

export const revalidate = 3600;

/** Scheda sintetica per gli assistenti AI (formato llms.txt). */
export async function GET() {
  const services = await getServices().catch(() => []);
  const euro = (c: number) => `${(c / 100).toFixed(2).replace('.', ',')} €`;

  const text = [
    `# ${SITE_CONFIG.name}`,
    '',
    `> Barberia a Foggia per uomo, ragazzo e bimbo. Taglio, barba e acconciatura. ${SITE_CONFIG.address}.`,
    '',
    '## Contatti',
    `- Indirizzo: ${SITE_CONFIG.address}`,
    `- Telefono e WhatsApp: ${SITE_CONFIG.phoneDisplay}`,
    `- Instagram: ${SITE_CONFIG.instagramHandle}`,
    `- Mappa: ${SITE_CONFIG.googleMapsUrl}`,
    '',
    '## Orari',
    ...SITE_CONFIG.detailedHours.map((h) => `- ${h.day}: ${h.time}`),
    '',
    '## Prenotazione',
    `- Online, con scelta di servizio, barbiere e orario: ${SITE_URL}/prenota`,
    `- Disdetta gratuita fino a ${SITE_CONFIG.cancellationMinutes} minuti prima dall'area clienti.`,
    '',
    '## Servizi e prezzi',
    ...(services.length
      ? services.map((s) => `- ${s.name}: ${euro(s.price_cents)}, ${s.duration_minutes} minuti`)
      : SITE_CONFIG.services.map((s) => `- ${s}`)),
    '',
    '## Pagine utili',
    `- [Servizi e prezzi](${SITE_URL}/servizi)`,
    `- [Galleria](${SITE_URL}/galleria)`,
    `- [Recensioni](${SITE_URL}/recensioni)`,
    `- [Contatti e orari](${SITE_URL}/contatti)`,
    ...LOCAL_PAGES.map((p) => `- [${p.h1}](${SITE_URL}/${p.slug})`),
    `- [Prima visita: come funziona](${SITE_URL}/prima-visita)`,
    `- [Domande frequenti](${SITE_URL}/faq)`,
    `- [Offerte attive](${SITE_URL}/offerte)`,
    `- [Prodotti in salone](${SITE_URL}/prodotti)`,
    `- [Lavora con noi](${SITE_URL}/lavora-con-noi)`,
    '',
    '## Journal',
    ...JOURNAL.map((a) => `- [${a.title}](${SITE_URL}/journal/${a.slug}): ${a.description}`),
    '',
  ].join('\n');

  return new Response(text, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, s-maxage=3600' },
  });
}
