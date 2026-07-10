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
      <div className="gallery-filters-bar mb-8 flex flex-wrap items-center gap-3">
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