/**
 * Journal di Barberia Garofalo: articoli brevi e utili.
 * Testi originali. Per aggiungere un articolo basta un nuovo oggetto qui.
 */
export type JournalBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'tip'; text: string };

export type JournalArticle = {
  slug: string;
  title: string;
  description: string;
  category: string;
  date: string; // YYYY-MM-DD
  readMinutes: number;
  image: string;
  imageAlt: string;
  cta: { href: string; label: string };
  blocks: JournalBlock[];
};

export const JOURNAL: JournalArticle[] = [
  {
    slug: 'ogni-quanto-tagliare-i-capelli',
    title: 'Ogni quanto tagliare i capelli? Dipende dal taglio',
    description: 'Sfumatura, taglio classico o capelli più lunghi: ogni quanto tornare dal barbiere per tenere il taglio in ordine.',
    category: 'Capelli',
    date: '2026-10-13',
    readMinutes: 3,
    image: '/assets/gallery/1000313551.jpg',
    imageAlt: 'Sfumatura bassa appena rifinita',
    cta: { href: '/prenota', label: 'Prenota il prossimo taglio' },
    blocks: [
      { type: 'p', text: 'Non esiste una regola uguale per tutti. Conta soprattutto una cosa: quanto è corto il taglio ai lati. Più è corto, prima si vede che i capelli sono cresciuti.' },
      { type: 'h2', text: 'Sfumature e tagli molto corti' },
      { type: 'p', text: 'Una sfumatura perde definizione in fretta. Dopo due o tre settimane la linea si ammorbidisce e il contrasto tra lati e sopra si riduce.' },
      { type: 'list', items: ['Skin fade o sfumatura alta: ogni 2–3 settimane.', 'Sfumatura media o bassa: ogni 3–4 settimane.'] },
      { type: 'h2', text: 'Tagli classici e media lunghezza' },
      { type: 'p', text: 'Con le forbici e più lunghezza ai lati il taglio cresce in modo più uniforme. Qui si può aspettare di più.' },
      { type: 'list', items: ['Taglio classico corto: ogni 4–5 settimane.', 'Capelli medi o lunghi: ogni 6–8 settimane, per rifinire punte e forma.'] },
      { type: 'tip', text: 'Un trucco semplice: quando prenoti, segnati già la data del taglio dopo. Così non arrivi mai “fuori forma”.' },
      { type: 'h2', text: 'E la barba?' },
      { type: 'p', text: 'Una barba corta e definita va rifinita ogni 1–2 settimane. Una barba lunga regge di più, ma i contorni vanno sistemati almeno una volta al mese.' },
    ],
  },
  {
    slug: 'primo-taglio-bambino',
    title: 'Il primo taglio del bambino: come prepararlo',
    description: 'Consigli pratici per rendere il primo taglio dal barbiere un momento sereno, per il bambino e per i genitori.',
    category: 'Bambini',
    date: '2026-10-13',
    readMinutes: 3,
    image: '/assets/sostituisci-immagini/homepage/3.jpg',
    imageAlt: 'Il salone della Barberia Garofalo a Foggia',
    cta: { href: '/prenota?service=Taglio%20baby', label: 'Prenota il taglio baby' },
    blocks: [
      { type: 'p', text: 'Per un bambino il barbiere è un posto nuovo: rumori, una poltrona alta, una mantellina, una persona che non conosce. Con qualche accorgimento il primo taglio diventa un bel ricordo.' },
      { type: 'h2', text: 'Prima di venire' },
      { type: 'list', items: ['Scegli un orario in cui il bambino è riposato, non vicino al sonnellino.', 'Raccontagli cosa succederà con parole semplici: “ti sistemiamo i capelli come al papà”.', 'Quando prenoti, scrivi nelle note che è il primo taglio.'] },
      { type: 'h2', text: 'In salone' },
      { type: 'p', text: 'Un genitore può restare sempre vicino. Andiamo con calma e facciamo pause quando servono: niente fretta, niente pressione.' },
      { type: 'tip', text: 'Un giochino o un cartone sul telefono aiutano molto a stare fermi qualche minuto.' },
      { type: 'h2', text: 'Dopo il taglio' },
      { type: 'p', text: 'Molti genitori conservano un ciuffo del primo taglio. Se ti fa piacere, diccelo prima di iniziare.' },
    ],
  },
  {
    slug: 'barba-lama-forbici-panno-caldo',
    title: 'Lama, forbici o panno caldo: quale servizio barba scegliere',
    description: 'Le differenze tra rasatura con lama, barba modellata a forbici e trattamento con panno caldo, per scegliere quello giusto.',
    category: 'Barba',
    date: '2026-10-13',
    readMinutes: 3,
    image: '/assets/gallery/1000313557.jpg',
    imageAlt: 'Barba lunga curata e contorni definiti',
    cta: { href: '/barba-foggia', label: 'Vedi i servizi barba e i prezzi' },
    blocks: [
      { type: 'p', text: 'Tre servizi, tre risultati diversi. La scelta dipende da come porti la barba e da quanto tempo vuoi dedicarle.' },
      { type: 'h2', text: 'Barba rasata con lama' },
      { type: 'p', text: 'Per chi vuole il viso pulito, oppure per chi porta la barba e vuole contorni netti su guance e collo. È il servizio più rapido.' },
      { type: 'h2', text: 'Barba modellata a forbici' },
      { type: 'p', text: 'Per chi vuole tenere la barba ma in ordine. Si accorcia dove serve, si dà forma e si rifiniscono i contorni senza perdere lunghezza.' },
      { type: 'h2', text: 'Barba con panno caldo' },
      { type: 'p', text: 'Il panno caldo apre i pori e ammorbidisce il pelo. La rasatura è più morbida e la pelle si irrita meno. In più è un momento di relax vero.' },
      { type: 'tip', text: 'Pelle sensibile o arrossamenti dopo la rasatura? Prova il panno caldo: spesso fa la differenza.' },
      { type: 'h2', text: 'Insieme al taglio' },
      { type: 'p', text: 'Puoi aggiungere la barba al taglio nella stessa prenotazione. Il sistema calcola da solo il tempo totale.' },
    ],
  },
  {
    slug: 'sfumatura-alta-media-bassa',
    title: 'Sfumatura alta, media o bassa: come scegliere',
    description: 'Cosa cambia tra sfumatura alta, media e bassa e quale si adatta meglio al tuo viso e al tuo stile.',
    category: 'Capelli',
    date: '2026-10-13',
    readMinutes: 4,
    image: '/assets/gallery/1000313543.jpg',
    imageAlt: 'Sfumatura vista da dietro',
    cta: { href: '/prenota?service=Taglio%20e%20shampoo', label: 'Prenota il taglio' },
    blocks: [
      { type: 'p', text: 'La sfumatura è il passaggio graduale da capelli cortissimi a capelli più lunghi. La differenza tra alta, media e bassa è semplice: è il punto della testa dove inizia.' },
      { type: 'h2', text: 'Sfumatura bassa' },
      { type: 'p', text: 'Parte appena sopra l’orecchio e la nuca. È discreta e pulita. Va bene quasi per tutti, anche in ufficio.' },
      { type: 'h2', text: 'Sfumatura media' },
      { type: 'p', text: 'Parte a metà dei lati. È la più versatile: moderna ma non estrema. Funziona bene con capelli più lunghi sopra.' },
      { type: 'h2', text: 'Sfumatura alta' },
      { type: 'p', text: 'Parte in alto, vicino alla parte superiore della testa. Il contrasto è forte e il look è deciso. Richiede ritocchi più frequenti.' },
      { type: 'h2', text: 'Come scegliere' },
      { type: 'list', items: ['Viso tondo: una sfumatura media o alta slancia.', 'Viso lungo: meglio bassa, per non allungarlo ancora.', 'Poco tempo per i ritocchi: bassa o media.'] },
      { type: 'tip', text: 'Non sei sicuro? Porta una foto e ne parliamo prima di iniziare. Prima si ascolta, poi si taglia.' },
    ],
  },
  {
    slug: 'come-spiegare-il-taglio-al-barbiere',
    title: 'Come spiegare al barbiere il taglio che vuoi',
    description: 'Cinque consigli per farti capire dal barbiere e uscire con il taglio che avevi in mente.',
    category: 'Consigli',
    date: '2026-10-13',
    readMinutes: 3,
    image: '/assets/gallery/1000313549.jpg',
    imageAlt: 'Uomo con capelli medi pettinati di lato',
    cta: { href: '/prima-visita', label: 'Leggi come funziona la prima visita' },
    blocks: [
      { type: 'p', text: '“Corto ai lati e un po’ sopra” può voler dire dieci tagli diversi. Ecco come spiegarti in modo chiaro.' },
      { type: 'h2', text: '1. Porta una foto' },
      { type: 'p', text: 'È il modo più veloce. Meglio due o tre foto, anche di lato e da dietro. Dicci anche cosa non ti piace.' },
      { type: 'h2', text: '2. Racconta la tua routine' },
      { type: 'p', text: 'Quanto tempo hai la mattina? Usi cera o gel? Un taglio bellissimo che richiede 15 minuti di piega non è adatto a chi esce di corsa.' },
      { type: 'h2', text: '3. Parla di lunghezza in centimetri' },
      { type: 'p', text: '“Togli un dito” è più chiaro di “spunta un po’”. Per i lati puoi dire il numero della macchinetta, se lo conosci.' },
      { type: 'h2', text: '4. Indica dove vuoi la riga' },
      { type: 'p', text: 'Riga a destra, a sinistra o niente riga? Pettinati all’indietro o in avanti? Sono dettagli che cambiano il risultato.' },
      { type: 'h2', text: '5. Fermaci se qualcosa non ti convince' },
      { type: 'p', text: 'Meglio dirlo subito che a fine taglio. Per noi è normale: è il tuo taglio.' },
      { type: 'tip', text: 'Puoi scrivere le tue preferenze anche nelle note della prenotazione: le leggiamo prima che arrivi.' },
    ],
  },
];

export function getArticle(slug: string) {
  return JOURNAL.find((a) => a.slug === slug);
}

export function formatJournalDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
}
