'use client';

import { useEffect, useRef, useState } from 'react';
import { LocLink as Link } from '@/components/i18n/LocLink';
import { useLang } from '@/components/i18n/LangProvider';
import { ArrowRight, Baby, CalendarDays, Clock, Scissors, Sparkles, Wind, X } from 'lucide-react';
import { BABY_NOTE } from '@/lib/data/services';
import { BABY_NOTE_EN } from '@/lib/i18n/content-servizi';
import { L } from '@/lib/i18n';
import { formatDuration, formatPrice } from '@/lib/utils';
import type { ServiceCategory } from '@/types/database';
import './services-grid.css';

export type ServiceGroup = {
  category: ServiceCategory;
  label: string;
  subtitle: string;
  items: {
    id: string;
    name: string;
    price_cents: number;
    duration_minutes: number;
  }[];
};

const CATEGORY_ICONS: Record<ServiceCategory, typeof Scissors> = {
  taglio: Scissors,
  baby: Baby,
  barba: Wind,
  styling: Sparkles,
};

/** Foto reali del salone per ogni categoria. */
const CATEGORY_IMAGES: Record<ServiceCategory, string> = {
  taglio: '/assets/gallery/web/1000313550.webp',
  baby: '/assets/gallery/web/1000313555.webp',
  barba: '/assets/gallery/web/1000313557.webp',
  styling: '/assets/gallery/web/1000313548.webp',
};

function minPrice(items: ServiceGroup['items']) {
  return formatPrice(Math.min(...items.map((i) => i.price_cents)));
}

export function ServicesGrid({ groups }: { groups: ServiceGroup[] }) {
  const lang = useLang();
  const [open, setOpen] = useState<ServiceCategory | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  // Link diretti tipo /servizi#barba aprono la categoria.
  useEffect(() => {
    const hash = window.location.hash.replace('#', '') as ServiceCategory;
    if (groups.some((g) => g.category === hash)) setOpen(hash);
  }, [groups]);

  const select = (category: ServiceCategory) => {
    const next = open === category ? null : category;
    setOpen(next);
    if (next) {
      history.replaceState(null, '', `#${next}`);
      requestAnimationFrame(() => {
        detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    } else {
      history.replaceState(null, '', window.location.pathname);
    }
  };

  const active = groups.find((g) => g.category === open) ?? null;
  const ActiveIcon = active ? CATEGORY_ICONS[active.category] : null;

  return (
    <div className="svc-grid-wrap">
      <div className="svc-grid-head">
        <div>
          <h2 className="svc-grid-title">{L(lang, 'Scegli il tuo servizio', 'Choose your service')}</h2>
          <p className="svc-grid-sub">{L(lang, 'Ogni dettaglio è pensato per esaltare il tuo stile.', 'Every detail is designed to bring out your style.')}</p>
        </div>
        <Link href="/prenota" className="svc-book-btn">
          <CalendarDays size={16} strokeWidth={1.75} aria-hidden />
          {L(lang, 'Prenota ora', 'Book now')}
          <ArrowRight size={14} aria-hidden />
        </Link>
      </div>

      <div className="svc-grid">
        {groups.map((group) => {
          const isOpen = open === group.category;
          return (
            <button
              key={group.category}
              id={group.category}
              type="button"
              onClick={() => select(group.category)}
              aria-expanded={isOpen}
              aria-controls="svc-detail"
              className={`svc-card scroll-mt-32 ${isOpen ? 'is-active' : ''}`}
            >
              <span
                className="svc-card-img"
                style={{ backgroundImage: `url(${CATEGORY_IMAGES[group.category]})` }}
                aria-hidden
              />
              <span className="svc-card-shade" aria-hidden />
              <span className="svc-card-body">
                <span className="svc-card-label">{group.label}</span>
                <span className="svc-card-subtitle">{group.subtitle}</span>
                <span className="svc-card-foot">
                  <span className="svc-card-from">
                    {L(lang, 'A partire da', 'From')} <strong>{minPrice(group.items)}</strong>
                  </span>
                  <span className="svc-card-arrow" aria-hidden>
                    <ArrowRight size={14} />
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div
        id="svc-detail"
        ref={detailRef}
        className={`svc-detail ${active ? 'is-open' : ''}`}
        role="region"
        aria-label={active?.label ?? L(lang, 'Dettaglio servizi', 'Service details')}
      >
        <div className="svc-detail-inner">
          {active && ActiveIcon && (
            <div className="svc-detail-card">
              <div className="svc-detail-head">
                <span className="svc-detail-icon" aria-hidden>
                  <ActiveIcon size={20} strokeWidth={1.6} />
                </span>
                <div className="svc-detail-heading">
                  <p className="svc-detail-label">{active.label}</p>
                  <p className="svc-detail-meta">
                    {active.items.length}{' '}
                    {lang === 'en'
                      ? active.items.length === 1 ? 'service' : 'services'
                      : active.items.length === 1 ? 'servizio' : 'servizi'}{' '}
                    · {active.subtitle}
                  </p>
                </div>
                <button type="button" className="svc-detail-close" onClick={() => select(active.category)} aria-label={L(lang, 'Chiudi', 'Close')}>
                  <X size={18} />
                </button>
              </div>

              {active.category === 'baby' && <p className="svc-detail-note">{L(lang, BABY_NOTE, BABY_NOTE_EN)}</p>}

              <ul className="svc-list">
                {active.items.map((service, index) => (
                  <li key={service.id} className="svc-item">
                    <span className="svc-item-index">{String(index + 1).padStart(2, '0')}</span>
                    <div className="svc-item-info">
                      <p className="svc-item-name">{service.name}</p>
                      <span className="svc-item-duration">
                        <Clock size={12} aria-hidden />
                        {formatDuration(service.duration_minutes)}
                      </span>
                    </div>
                    <span className="svc-item-price">{formatPrice(service.price_cents)}</span>
                    <Link href="/prenota" className="svc-item-book">
                      {L(lang, 'Prenota', 'Book')}
                      <ArrowRight size={13} aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
