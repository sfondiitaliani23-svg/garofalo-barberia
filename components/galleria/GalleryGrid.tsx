'use client';

import Image from 'next/image';
import { useState } from 'react';
import { GALLERY_FILTERS, GALLERY_IMAGES } from '@/lib/data/gallery';

export function GalleryGrid() {
  const [activeFilter, setActiveFilter] = useState<string>('tutti');

  const filtered =
    activeFilter === 'tutti'
      ? GALLERY_IMAGES
      : GALLERY_IMAGES.filter((img) => img.category === activeFilter);

  return (
    <>
      <div className="gallery-filters-bar sticky top-20 z-20 mb-8 flex flex-wrap gap-3 py-3">
        {GALLERY_FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            className={`filter-btn${activeFilter === filter.id ? ' active' : ''}`}
            onClick={() => setActiveFilter(filter.id)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <p className="mb-6 text-sm text-white/50">
        Nota privacy: le foto con bambini mostrano solo dettagli del taglio — mai il volto in primo piano.
      </p>

      <div className="gallery-grid">
        {filtered.map((image) => (
          <div key={image.src} className="gallery-item" data-category={image.category}>
            <Image src={image.src} alt={image.alt} fill sizes="(max-width: 768px) 50vw, 33vw" className="object-cover" />
          </div>
        ))}
      </div>
    </>
  );
}