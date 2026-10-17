export type GalleryCategory = 'uomo' | 'ragazzo' | 'bimbo';

export type GalleryStyle = 'sfumato' | 'classico' | 'ricci' | 'barba' | 'styling';

export interface GalleryImage {
  src: string;
  /** Tipo di taglio: serve al filtro «Stile». */
  styles: GalleryStyle[];
  alt: string;
  category: GalleryCategory;
  /** Testo della slide nel carosello: etichetta, titolo, parte in oro, descrizione. */
  eyebrow: string;
  title: string;
  accent: string;
  text: string;
}

export const GALLERY_IMAGES: GalleryImage[] = [
  { src: '/assets/gallery/1000313543.jpg', styles: ['sfumato'], alt: 'Fade posteriore ragazzo', category: 'ragazzo', eyebrow: 'Dal 2012', title: 'Ogni sfumatura', accent: 'ha una storia.', text: "Luigi fa questo lavoro dal 2012. Ogni fade che esce dalla sua poltrona porta con sé tutta quell'esperienza." },
  { src: '/assets/gallery/1000313544.jpg', styles: ['ricci', 'barba'], alt: 'Taglio uomo ricci con barba', category: 'uomo', eyebrow: 'La gavetta', title: 'Tredici anni', accent: 'prima di aprire.', text: 'Prima della sua Barberia, Luigi ha fatto 13 anni di gavetta, tra corsi di aggiornamento e lezioni dai maestri del mestiere.' },
  { src: '/assets/gallery/1000313545.jpg', styles: ['ricci'], alt: 'Uomo capelli mossi con baffi', category: 'uomo', eyebrow: 'Un nome, una firma', title: 'Il nostro cognome', accent: 'è la nostra firma.', text: 'La Barberia porta il nome Garofalo: ogni taglio è un marchio di riconoscimento, nel bene e nel male.' },
  { src: '/assets/gallery/1000313546.jpg', styles: ['classico', 'barba'], alt: 'Slick back con barba corta', category: 'uomo', eyebrow: 'Tempi giusti', title: 'Il risultato', accent: 'prima del cronometro.', text: 'Tagli precisi e rasature affidabili, con tempi che rispettano il risultato, non il fatturato.' },
  { src: '/assets/gallery/1000313547.jpg', styles: ['sfumato'], alt: 'Taglio bimbo con colpi di sole', category: 'bimbo', eyebrow: 'Famiglie', title: 'Qui i più piccoli', accent: 'sono di casa.', text: 'Uno spazio dove le famiglie si sentono a casa, anche con i più piccoli in poltrona.' },
  { src: '/assets/gallery/1000313548.jpg', styles: ['styling'], alt: 'Styling spray capelli uomo', category: 'uomo', eyebrow: 'Il tocco finale', title: 'Lo styling', accent: 'fa la differenza.', text: 'Shampoo e consulenza styling sono inclusi con ogni taglio. Esci pronto, non solo tagliato.' },
  { src: '/assets/gallery/1000313549.jpg', styles: ['classico'], alt: 'Uomo capelli lunghi laterale', category: 'uomo', eyebrow: 'Ascolto', title: 'Prima si ascolta,', accent: 'poi si taglia.', text: 'Ogni stile nasce da quello che ci racconti: come porti i capelli, quanto tempo hai, come ti vedi.' },
  { src: '/assets/gallery/1000313550.jpg', styles: ['classico'], alt: 'Taglio ragazzo con riga laterale', category: 'ragazzo', eyebrow: 'Precisione', title: 'Una riga', accent: 'non si improvvisa.', text: 'Riga, sfumatura, rifinitura: sono i dettagli piccoli a tenere pulito un taglio per giorni.' },
  { src: '/assets/gallery/1000313551.jpg', styles: ['sfumato'], alt: 'Fade basso ragazzo biondo', category: 'ragazzo', eyebrow: 'Il posto di tutti', title: 'Da bambini', accent: 'ad adulti.', text: 'Luigi ha creato una Barberia per tutti: dai più piccoli agli adulti, ognuno con il suo taglio.' },
  { src: '/assets/gallery/1000313552.jpg', styles: ['classico'], alt: 'Slick back ragazzo con occhiali', category: 'ragazzo', eyebrow: 'Atmosfera', title: 'Rilassati,', accent: 'sei in barberia.', text: 'Qui ci si rilassa, si scambiano due parole, ci si fa una risata. Un posto dove si sta bene insieme.' },
  { src: '/assets/gallery/1000313553.jpg', styles: ['styling'], alt: 'Pompadour ragazzo profilo', category: 'ragazzo', eyebrow: 'Tendenza', title: 'Lo stile', accent: 'che ti rappresenta.', text: 'Pompadour, texture e tagli di tendenza: ti consigliamo il look giusto e lo realizziamo con cura.' },
  { src: '/assets/gallery/1000313554.jpg', styles: ['classico'], alt: 'Taglio uomo elegante con barba', category: 'uomo', eyebrow: 'Il team', title: 'Tre professionisti,', accent: 'una sola cura.', text: 'Luigi, Vittorio e Francesco: la stessa attenzione su ogni taglio e su ogni barba.' },
  { src: '/assets/gallery/1000313555.jpg', styles: ['sfumato'], alt: 'Taglio bimbo fade', category: 'bimbo', eyebrow: 'Senza fretta', title: 'Il primo taglio,', accent: 'con calma.', text: 'Niente fretta, niente pressione: prendiamo tutto il tempo necessario. Se è la prima volta, scrivilo nelle note quando prenoti.' },
  { src: '/assets/gallery/1000313556.png', styles: ['sfumato'], alt: 'Bimbo skin fade vista dall alto', category: 'bimbo', eyebrow: 'Dettagli', title: 'Visto da vicino,', accent: 'è tutto pulito.', text: 'Una sfumatura si giudica da vicino. Lavoriamo ogni passaggio finché non è uniforme.' },
  { src: '/assets/gallery/1000313557.jpg', styles: ['barba'], alt: 'Uomo rasato con barba lunga', category: 'uomo', eyebrow: 'Barba', title: 'Una barba', accent: 'che si fa notare.', text: 'Rasata a lama, modellata a forbici o con panno caldo: la barba ha i suoi servizi dedicati.' },
  { src: '/assets/gallery/1000313558.jpg', styles: ['sfumato'], alt: 'Taglio ragazzo texturizzato', category: 'ragazzo', eyebrow: 'Prezzi chiari', title: 'Quello che vedi', accent: 'è quello che paghi.', text: 'Listino trasparente, nessun supplemento nascosto. E paghi in salone, dopo il servizio.' },
  { src: '/assets/gallery/1000313559.jpg', styles: ['sfumato'], alt: 'Uomo capelli rasati skin fade', category: 'uomo', eyebrow: "Viale d'Addedda, Foggia", title: 'Ti aspettiamo', accent: 'in poltrona.', text: "Siamo in Viale Ignazio d'Addedda 236, a Foggia. Prenota online e scegli tu l'orario." },
];

export const GALLERY_FILTERS = [
  { id: 'tutti', label: 'Tutti' },
  { id: 'uomo', label: 'Uomo' },
  { id: 'ragazzo', label: 'Ragazzo' },
  { id: 'bimbo', label: 'Bimbo' },
] as const;
export const GALLERY_STYLE_FILTERS = [
  { id: 'tutti', label: 'Tutti gli stili' },
  { id: 'sfumato', label: 'Sfumato' },
  { id: 'classico', label: 'Classico' },
  { id: 'ricci', label: 'Ricci e mossi' },
  { id: 'barba', label: 'Barba' },
  { id: 'styling', label: 'Styling' },
] as const;
