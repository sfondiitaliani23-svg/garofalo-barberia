export const PRICE_LIST = [
  { name: 'Taglio e shampoo', price: '€17' },
  { name: 'Taglio baby', price: '€13' },
  { name: 'Barba rasata / lama', price: '€6' },
  { name: 'Barba modellata a forbici', price: '€8' },
  { name: 'Barba con panno caldo', price: '€10' },
  { name: 'Shampoo e acconciatura', price: '€8' },
] as const;

export const PHOTO_STRIP = [
  { src: '/assets/sostituisci-immagini/homepage/newbanner-1.png', alt: 'Rasatura e cura barba in barberia' },
  { src: '/assets/sostituisci-immagini/homepage/newbanner-2.png', alt: 'Trattamento barba professionale' },
  { src: '/assets/sostituisci-immagini/homepage/newbanner-3.png', alt: 'Barba e taglio in salone' },
  { src: '/assets/sostituisci-immagini/homepage/newbanner-4.png', alt: 'Dettaglio cura barba' },
] as const;

export const PERFUMES = [
  {
    name: 'Mood Velvet',
    image: '/assets/sostituisci-immagini/homepage/4-1.jpg',
    lead: 'Mood Velvet Eau De Parfum è una fragranza orientale floreale.',
    body: 'Un profumo brioso e sensuale per la donna passionale.',
    notes: [
      { label: 'Note di testa', value: 'Note Fruttate, Zafferano.' },
      { label: 'Note di cuore', value: 'Ambra, Gelsomino.' },
      { label: 'Note di fondo', value: 'Muschio, Caramello, Musk, Accordo Talcato.' },
    ],
    footer: 'Profumo Mood Velvet',
  },
  {
    name: 'Fancy',
    image: '/assets/sostituisci-immagini/homepage/4-2.jpg',
    lead: 'Fruttata e Agrumata, quindi rigogliosa, brillante e soave, soprattutto esuberante.',
    body: 'Con le sue note di testa agrumate all\'arancia, al bergamotto e ai limoni di Sicilia, con il suo cuore pieno di Frutti del Mediterraneo, con il suo fondo al musk, alla vaniglia e all\'ambra.',
    notes: [],
    footer: null,
  },
  {
    name: 'Mood Imperious',
    image: '/assets/sostituisci-immagini/homepage/4-3.jpg',
    lead: 'Fruttato e legnoso, quindi vibrante, impetuoso e intrepido, soprattutto, valoroso.',
    body: 'Con il suo mix di testa fruttato e speziato, all\'ananas, ribes nero e pepe rosa, con il suo cuore di patchouli, cuoio e lavanda, con il suo fondo di muschio bianco e ambra grigia.',
    notes: [],
    footer: null,
  },
  {
    name: 'Aroma',
    image: '/assets/sostituisci-immagini/homepage/4-4.jpg',
    lead: 'Floreale e orientale, quindi accattivante, dolce e dinamico, soprattutto intenso.',
    body: 'Con i suoi accordi al caffè e note floreali, con il suo cuore legnoso e floreale, con il suo fondo di ambra e accordi gourmand.',
    notes: [],
    footer: null,
  },
] as const;

export const REVIEWS = [
  {
    text: 'Finalmente una barberia vera. Professionali, amichevoli e il prezzo è giusto. Torno sempre lì.',
    author: 'Marco R.',
  },
  {
    text: 'Porto mio figlio di 5 anni da tre anni. Non ha paura, ambiente tranquillo. Consiglio vivamente.',
    author: 'Francesca M.',
  },
  {
    text: 'Tagli precisi, rapidi e affidabili. Perfetto per chi ha poco tempo ma non vuole scendere a compromessi.',
    author: 'Giuseppe T.',
  },
] as const;