'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { PERFUMES } from '@/lib/data/homepage';

type Perfume = (typeof PERFUMES)[number];

const FLIGHT_MS = 650;
const FLIGHT_EASING = 'cubic-bezier(0.4, 0.2, 0.2, 1)';

type FlightRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

function getTargetRect(): FlightRect {
  const width = Math.min(360, window.innerWidth * 0.88);
  const height = width * (5 / 4);
  return {
    top: (window.innerHeight - height) / 2,
    left: (window.innerWidth - width) / 2,
    width,
    height,
  };
}

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
  const [flightFrom, setFlightFrom] = useState<FlightRect | null>(null);
  const [flightTo, setFlightTo] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setPortalReady(true);
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => setCanHover(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const openSpotlight = useCallback(
    (index: number) => {
      const el = cardRefs.current[index];
      if (!el) return;

      clearCloseTimer();
      const rect = el.getBoundingClientRect();

      setFlightTo(false);
      setIsFlipped(false);
      setActiveIndex(index);
      setFlightFrom({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setFlightTo(true);
          setIsFlipped(true);
        });
      });
    },
    [clearCloseTimer],
  );

  const closeSpotlight = useCallback(() => {
    if (activeIndex === null) return;

    clearCloseTimer();
    setFlightTo(false);
    setIsFlipped(false);

    closeTimerRef.current = window.setTimeout(() => {
      setActiveIndex(null);
      setFlightFrom(null);
      closeTimerRef.current = null;
    }, FLIGHT_MS);
  }, [activeIndex, clearCloseTimer]);

  useEffect(() => {
    if (!canHover) return;

    const section = document.querySelector('.section-profumi-mood');
    if (!section) return;

    if (activeIndex !== null) {
      section.classList.add('is-perfume-spotlight');
    } else {
      section.classList.remove('is-perfume-spotlight');
    }

    return () => section.classList.remove('is-perfume-spotlight');
  }, [activeIndex, canHover]);

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

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
  const flightRect = flightFrom ? (flightTo ? getTargetRect() : flightFrom) : null;

  const flyingStyle: CSSProperties | undefined = flightRect
    ? {
        top: flightRect.top,
        left: flightRect.left,
        width: flightRect.width,
        height: flightRect.height,
        transition: `top ${FLIGHT_MS}ms ${FLIGHT_EASING}, left ${FLIGHT_MS}ms ${FLIGHT_EASING}, width ${FLIGHT_MS}ms ${FLIGHT_EASING}, height ${FLIGHT_MS}ms ${FLIGHT_EASING}`,
      }
    : undefined;

  const spotlightPortal =
    portalReady && canHover && activePerfume && flightFrom
      ? createPortal(
          <>
            <div className="perfume-spotlight-backdrop" aria-hidden="true" />
            <div className="perfume-spotlight-card" style={flyingStyle} aria-hidden="true">
              <div className={`perfume-card-inner${isFlipped ? ' is-flipped' : ''}`}>
                <PerfumeCardFace perfume={activePerfume} />
              </div>
            </div>
          </>,
          document.body,
        )
      : null;

  return (
    <div
      className={`perfumes-grid-wrap${activeIndex !== null ? ' is-spotlight-active' : ''}`}
      onMouseLeave={canHover ? closeSpotlight : undefined}
    >
      {spotlightPortal}

      <div className="services-grid perfumes-grid">
        {PERFUMES.map((perfume, index) => {
          const isActive = activeIndex === index;
          const isFlippedMobile = flippedMobile === index;

          return (
            <div
              key={perfume.name}
              ref={(el) => {
                cardRefs.current[index] = el;
              }}
              className={[
                'perfume-card-flip',
                isActive ? 'is-spotlight-source' : '',
                isFlippedMobile ? 'is-flipped' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              tabIndex={0}
              onMouseEnter={canHover ? () => openSpotlight(index) : undefined}
              onFocus={canHover ? () => openSpotlight(index) : undefined}
              onBlur={
                canHover
                  ? (e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                        closeSpotlight();
                      }
                    }
                  : undefined
              }
              onClick={() => handleCardClick(index)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (canHover) {
                    openSpotlight(index);
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