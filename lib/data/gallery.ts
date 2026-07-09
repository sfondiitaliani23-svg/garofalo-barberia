export type GalleryCategory = 'uomo' | 'ragazzo' | 'bimbo';

export interface GalleryImage {
  src: string;
  alt: string;
  category: GalleryCategory;
}

export const GALLERY_IMAGES: GalleryImage[] = [
  { src: '/assets/gallery/1000313543.jpg', alt: 'Fade posteriore', category: 'uomo' },
  { src: '/assets/gallery/1000313544.jpg', alt: 'Taglio in corso', category: 'uomo' },
  { src: '/assets/gallery/1000313545.jpg', alt: 'Taglio uomo frontale', category: 'uomo' },
  { src: '/assets/gallery/1000313546.jpg', alt: 'Taglio slick back con barba', category: 'uomo' },
  { src: '/assets/gallery/1000313547.jpg', alt: 'Taglio ragazzo con colpi di sole', category: 'ragazzo' },
  { src: '/assets/gallery/1000313548.jpg', alt: 'Dettaglio taglio posteriore', category: 'uomo' },
  { src: '/assets/gallery/1000313549.jpg', alt: 'Skin fade laterale', category: 'uomo' },
  { src: '/assets/gallery/1000313550.jpg', alt: 'Taglio con riga laterale', category: 'uomo' },
  { src: '/assets/gallery/1000313551.jpg', alt: 'Taglio corto styling', category: 'uomo' },
  { src: '/assets/gallery/1000313552.jpg', alt: 'Taglio posteriore', category: 'uomo' },
  { src: '/assets/gallery/1000313553.jpg', alt: 'Profilo taglio moderno', category: 'uomo' },
  { src: '/assets/gallery/1000313554.jpg', alt: 'Fade posteriore pulito', category: 'uomo' },
  { src: '/assets/gallery/1000313555.jpg', alt: 'Profilo taglio scuro', category: 'uomo' },
  { src: '/assets/gallery/1000313556.png', alt: 'Skin fade dettaglio', category: 'uomo' },
  { src: '/assets/gallery/1000313557.jpg', alt: 'Cura barba e taglio', category: 'uomo' },
  { src: '/assets/gallery/1000313558.jpg', alt: 'Taglio laterale', category: 'uomo' },
  { src: '/assets/gallery/1000313559.jpg', alt: 'Fade posteriore dettaglio', category: 'uomo' },
];

export const GALLERY_FILTERS = [
  { id: 'tutti', label: 'Tutti' },
  { id: 'uomo', label: 'Uomo' },
  { id: 'ragazzo', label: 'Ragazzo' },
  { id: 'bimbo', label: 'Bimbo' },
] as const;