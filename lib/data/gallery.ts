export type GalleryCategory = 'uomo' | 'ragazzo' | 'bimbo';

export interface GalleryImage {
  src: string;
  alt: string;
  category: GalleryCategory;
}

export const GALLERY_IMAGES: GalleryImage[] = [
  { src: '/assets/sostituisci-immagini/galleria/01-taglio-uomo.jpg', alt: 'Taglio uomo', category: 'uomo' },
  { src: '/assets/sostituisci-immagini/galleria/02-taglio-classico.jpg', alt: 'Taglio classico', category: 'uomo' },
  { src: '/assets/sostituisci-immagini/galleria/03-barba-taglio.jpg', alt: 'Barba e taglio', category: 'uomo' },
  { src: '/assets/sostituisci-immagini/galleria/04-styling-uomo.jpg', alt: 'Styling uomo', category: 'uomo' },
  { src: '/assets/sostituisci-immagini/galleria/05-taglio-ragazzo.jpg', alt: 'Taglio ragazzo', category: 'ragazzo' },
  { src: '/assets/sostituisci-immagini/galleria/06-acconciatura-ragazzo.jpg', alt: 'Acconciatura ragazzo', category: 'ragazzo' },
  { src: '/assets/sostituisci-immagini/galleria/07-taglio-bimbo.jpg', alt: 'Dettaglio taglio bimbo', category: 'bimbo' },
  { src: '/assets/sostituisci-immagini/galleria/08-dettaglio-bimbo.jpg', alt: 'Taglio bimbo', category: 'bimbo' },
  { src: '/assets/sostituisci-immagini/galleria/09-finishing-taglio.jpg', alt: 'Finishing taglio', category: 'uomo' },
  { src: '/assets/sostituisci-immagini/galleria/10-interno-salone.jpg', alt: 'Interno salone', category: 'uomo' },
  { src: '/assets/sostituisci-immagini/galleria/11-dettaglio-barba.jpg', alt: 'Dettaglio barba', category: 'uomo' },
  { src: '/assets/sostituisci-immagini/galleria/12-taglio-giovane.jpg', alt: 'Taglio giovane', category: 'ragazzo' },
];

export const GALLERY_FILTERS = [
  { id: 'tutti', label: 'Tutti' },
  { id: 'uomo', label: 'Uomo' },
  { id: 'ragazzo', label: 'Ragazzo' },
  { id: 'bimbo', label: 'Bimbo' },
] as const;