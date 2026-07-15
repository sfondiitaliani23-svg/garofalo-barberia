export type GalleryCategory = 'uomo' | 'ragazzo' | 'bimbo';

export interface GalleryImage {
  src: string;
  alt: string;
  category: GalleryCategory;
}

export const GALLERY_IMAGES: GalleryImage[] = [
  { src: '/assets/gallery/1000313543.jpg', alt: 'Fade posteriore ragazzo', category: 'ragazzo' },
  { src: '/assets/gallery/1000313544.jpg', alt: 'Taglio uomo ricci con barba', category: 'uomo' },
  { src: '/assets/gallery/1000313545.jpg', alt: 'Uomo capelli mossi con baffi', category: 'uomo' },
  { src: '/assets/gallery/1000313546.jpg', alt: 'Slick back con barba corta', category: 'uomo' },
  { src: '/assets/gallery/1000313547.jpg', alt: 'Taglio bimbo con colpi di sole', category: 'bimbo' },
  { src: '/assets/gallery/1000313548.jpg', alt: 'Styling spray capelli uomo', category: 'uomo' },
  { src: '/assets/gallery/1000313549.jpg', alt: 'Uomo capelli lunghi laterale', category: 'uomo' },
  { src: '/assets/gallery/1000313550.jpg', alt: 'Taglio ragazzo con riga laterale', category: 'ragazzo' },
  { src: '/assets/gallery/1000313551.jpg', alt: 'Fade basso ragazzo biondo', category: 'ragazzo' },
  { src: '/assets/gallery/1000313552.jpg', alt: 'Slick back ragazzo con occhiali', category: 'ragazzo' },
  { src: '/assets/gallery/1000313553.jpg', alt: 'Pompadour ragazzo profilo', category: 'ragazzo' },
  { src: '/assets/gallery/1000313554.jpg', alt: 'Taglio uomo elegante con barba', category: 'uomo' },
  { src: '/assets/gallery/1000313555.jpg', alt: 'Taglio bimbo fade', category: 'bimbo' },
  { src: '/assets/gallery/1000313556.png', alt: 'Bimbo skin fade vista dall alto', category: 'bimbo' },
  { src: '/assets/gallery/1000313557.jpg', alt: 'Uomo rasato con barba lunga', category: 'uomo' },
  { src: '/assets/gallery/1000313558.jpg', alt: 'Taglio ragazzo texturizzato', category: 'ragazzo' },
  { src: '/assets/gallery/1000313559.jpg', alt: 'Uomo capelli rasati skin fade', category: 'uomo' },
];

export const GALLERY_FILTERS = [
  { id: 'tutti', label: 'Tutti' },
  { id: 'uomo', label: 'Uomo' },
  { id: 'ragazzo', label: 'Ragazzo' },
  { id: 'bimbo', label: 'Bimbo' },
] as const;