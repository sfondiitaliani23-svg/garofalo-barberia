'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { PERFUMES } from '@/lib/data/homepage';

type Perfume = (typeof PERFUMES)[number];

function PerfumeCardFace({ perfume }: { perfume: Perfume }) {
  return (
    <>
      <div className="perfume-card-front service-card-luxury">
        <Image
          src={perfume.image}
          alt={perfume.name}
          width={400}
          height={500}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div className="service-card-body">
          <h3>{perfume.name}</h3>
          <span>Scopri di più</span>
        </div>
      </div>
      <div className="perfume-card-back">
        <h3>{perfume.name}</h3>
        <p className="perfume-card-lead">{perfume.lead}</p>
        <p>{perfume.body}</p>
        {perfume.notes.map((note) => (
          <p key={note.label} className="perfume-card-notes">
            <strong>{note.label}:</strong> {note.value}
          </p>
        ))}
        {perfume.footer && <p className="perfume-card-footer">{perfume.footer}</p>}
      </div>
    </>
  );
}

export function PerfumeCardsGrid() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [canHover, setCanHover] = useState(false);
  const [flippedMobile, setFlippedMobile] = useState<number | null>(null);

  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => setCanHover(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const closeSpotlight = useCallback(() => setActiveIndex(null), []);

  const handleCardClick = (index: number) => {
    if (canHover) return;
    setFlippedMobile((prev) => (prev === index ? null : index));
  };

  useEffect(() => {
    if (canHover) return;

    const onDocClick = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.perfume-card-flip')) {
        setFlippedMobile(null);
      }
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [canHover]);

  const activePerfume = activeIndex !== null ? PERFUMES[activeIndex] : null;

  return (
    <div
      className={`perfumes-grid-wrap${activeIndex !== null ? ' is-spotlight-active' : ''}`}
      onMouseLeave={canHover ? closeSpotlight : undefined}
    >
      {canHover && activePerfume && (
        <>
          <div className="perfume-spotlight-backdrop" aria-hidden="true" />
          <div className="perfume-spotlight-card" aria-hidden="true">
            <div className="perfume-card-inner is-flipped">
              <PerfumeCardFace perfume={activePerfume} />
            </div>
          </div>
        </>
      )}

      <div className="services-grid perfumes-grid">
        {PERFUMES.map((perfume, index) => {
          const isActive = activeIndex === index;
          const isFlippedMobile = flippedMobile === index;

          return (
            <div
              key={perfume.name}
              className={[
                'perfume-card-flip',
                isActive ? 'is-spotlight-source' : '',
                isFlippedMobile ? 'is-flipped' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              tabIndex={0}
              onMouseEnter={canHover ? () => setActiveIndex(index) : undefined}
              onFocus={canHover ? () => setActiveIndex(index) : undefined}
              onBlur={canHover ? (e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  closeSpotlight();
                }
              } : undefined}
              onClick={() => handleCardClick(index)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (canHover) {
                    setActiveIndex(index);
                  } else {
                    handleCardClick(index);
                  }
                }
                if (e.key === 'Escape' && canHover) {
                  closeSpotlight();
                }
              }}
            >
              <div className="perfume-card-inner">
                <PerfumeCardFace perfume={perfume} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}