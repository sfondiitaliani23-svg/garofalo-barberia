import type { ServiceCategory } from '@/types/database';

/**
 * Pagine per le ricerche locali su Google ("taglio uomo Foggia", ecc.).
 * Testi originali di Barberia Garofalo. Prezzi e durate arrivano dal listino vivo.
 */
export type LocalPage = {
  slug: string;
  title: string;
  description: string;
  eyebrow: string;
  h1: string;
  intro: string;
  categories: ServiceCategory[];
  image: string;
  imageAlt: string;
  points: { title: string; text: string }[];
  faq: { q: string; a: string }[];
};

export const LOCAL_PAGES: LocalPage[] = [
  {
    slug: 'taglio-uomo-foggia',
    title: 'Taglio uomo a Foggia',
    description:
      "Taglio uomo e ragazzo a Foggia con shampoo incluso: sfumature, classici e tagli moderni da Barberia Garofalo, Viale Ignazio d'Addedda 236. Prenota online.",
    eyebrow: 'Taglio uomo · Foggia',
    h1: 'Taglio uomo a Foggia',
    intro:
      "Sfumatura bassa, taglio classico o qualcosa di nuovo: prima ascoltiamo, poi tagliamo. Lo shampoo è sempre incluso e alla fine sistemiamo il capello come lo porterai fuori di qui.",
    categories: ['taglio', 'styling'],
    image: '/assets/gallery/1000313544.jpg',
    imageAlt: 'Taglio uomo alla Barberia Garofalo di Foggia',
    points: [
      { title: 'Esperienza', text: 'Luigi fa questo lavoro dal 2012. Con lui, Vittorio e Francesco: la stessa cura su ogni taglio.' },
      { title: 'Prima si parla', text: 'Due minuti per capire forma del viso, abitudini e quanto tempo vuoi dedicare al capello ogni mattina.' },
      { title: 'Shampoo incluso', text: 'Ogni taglio comprende lo shampoo. Nessun supplemento nascosto: il prezzo che vedi è quello che paghi.' },
      { title: 'Il tuo orario', text: 'Prenoti online scegliendo giorno e ora liberi. Paghi in salone, dopo il servizio.' },
    ],
    faq: [
      { q: 'Quanto dura un taglio uomo?', a: 'Circa mezz’ora, shampoo compreso. La durata esatta di ogni servizio è indicata nel listino qui sopra.' },
      { q: 'Posso venire senza prenotazione?', a: 'Consigliamo di prenotare online: così l’orario è garantito. Per sapere se c’è posto subito puoi scriverci su WhatsApp.' },
      { q: 'Posso aggiungere la barba al taglio?', a: 'Sì. Nella prenotazione puoi scegliere più servizi insieme, ad esempio taglio e barba, e il sistema calcola da solo il tempo necessario.' },
    ],
  },
  {
    slug: 'barba-foggia',
    title: 'Barba a Foggia: rasatura, forbici e panno caldo',
    description:
      'Barba a Foggia da Barberia Garofalo: rasatura con lama, barba modellata a forbici o trattamento con panno caldo. Prezzi chiari, prenotazione online.',
    eyebrow: 'Barba · Foggia',
    h1: 'Barba a Foggia',
    intro:
      'Rasatura completa con lama, barba corta modellata a forbici o il rituale con panno caldo: scegli il servizio adatto alla tua barba e al tempo che hai.',
    categories: ['barba'],
    image: '/assets/gallery/1000313557.jpg',
    imageAlt: 'Barba curata alla Barberia Garofalo di Foggia',
    points: [
      { title: 'Lama', text: 'Per una rasatura pulita o per definire i contorni con precisione.' },
      { title: 'Forbici', text: 'Per chi porta la barba e vuole mantenerla in forma senza perdere lunghezza.' },
      { title: 'Panno caldo', text: 'Il panno caldo ammorbidisce pelo e pelle: rasatura più morbida e un momento di vero relax.' },
    ],
    faq: [
      { q: 'Che differenza c’è tra i servizi barba?', a: 'La lama serve per radere o rifinire i contorni, le forbici per modellare una barba che vuoi tenere, il panno caldo aggiunge preparazione della pelle e relax.' },
      { q: 'Posso fare solo la barba?', a: 'Sì, i servizi barba si prenotano anche da soli. Se vuoi, li aggiungi al taglio nella stessa prenotazione.' },
      { q: 'Ogni quanto conviene sistemare la barba?', a: 'Dipende dalla lunghezza: per una barba corta e definita di solito ogni una o due settimane. Chiedici al prossimo appuntamento.' },
    ],
  },
  {
    slug: 'taglio-bambino-foggia',
    title: 'Taglio bambino a Foggia',
    description:
      'Taglio bambino a Foggia da Barberia Garofalo: primi tagli e tagli per i più piccoli, con calma e senza fretta. Prenota online scegliendo il servizio Taglio baby.',
    eyebrow: 'Taglio bimbo · Foggia',
    h1: 'Taglio bambino a Foggia',
    intro:
      'Portare un bambino dal barbiere può essere un’avventura. Qui prendiamo tutto il tempo necessario: niente fretta, niente pressione, e un genitore sempre accanto.',
    categories: ['baby'],
    image: '/assets/sostituisci-immagini/homepage/3.jpg',
    imageAlt: 'Taglio bambino alla Barberia Garofalo di Foggia',
    points: [
      { title: 'Con calma', text: 'Il tempo del servizio è pensato per i più piccoli: se serve una pausa, la facciamo.' },
      { title: 'Primo taglio', text: 'Se è la prima volta, scrivilo nelle note quando prenoti: ci organizziamo per renderlo un bel ricordo.' },
      { title: 'Tutta la famiglia', text: 'Papà, nonno e bambino nello stesso orario: nella prenotazione puoi scegliere più servizi.' },
    ],
    faq: [
      { q: 'Da che età tagliate i capelli ai bambini?', a: 'Accogliamo anche i più piccoli, compreso il primo taglio. Scrivi l’età nelle note della prenotazione così ci prepariamo.' },
      { q: 'Il genitore può restare vicino?', a: 'Certo, anzi lo consigliamo: per un bambino avere mamma o papà accanto fa la differenza.' },
      { q: 'Come prenoto il taglio bimbo?', a: 'Online, scegliendo il servizio “Taglio baby”, poi giorno e orario liberi.' },
    ],
  },
];

export function getLocalPage(slug: string) {
  return LOCAL_PAGES.find((p) => p.slug === slug);
}
