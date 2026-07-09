'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Baby, ChevronDown, Scissors, Sparkles, Wind } from 'lucide-react';
import { BABY_NOTE } from '@/lib/data/services';
import { formatDuration, formatPrice } from '@/lib/utils';
import type { ServiceCategory } from '@/types/database';
import './services-accordion.css';

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

function minPrice(items: ServiceGroup['items']) {
  const min = Math.min(...items.map((i) => i.price_cents));
  return formatPrice(min);
}

export function ServicesAccordion({ groups }: { groups: ServiceGroup[] }) {
  const [open, setOpen] = useState<ServiceCategory | null>(groups[0]?.category ?? null);

  const toggle = (category: ServiceCategory) => {
    setOpen((current) => (current === category ? null : category));
  };

  return (
    <div className="services-menu">
      {groups.map((group) => {
        const Icon = CATEGORY_ICONS[group.category];
        const isOpen = open === group.category;

        return (
          <div
            key={group.category}
            id={group.category}
            className={`menu-panel scroll-mt-32 ${isOpen ? 'is-open' : ''}`}
          >
            <button
              type="button"
              className="menu-panel-trigger"
              onClick={() => toggle(group.category)}
              aria-expanded={isOpen}
              aria-controls={`panel-${group.category}`}
            >
              <span className="menu-panel-icon" aria-hidden>
                <Icon size={20} strokeWidth={1.75} />
              </span>
              <span className="menu-panel-heading">
                <span className="menu-panel-label">{group.label}</span>
                <span className="menu-panel-meta">
                  {group.items.length} {group.items.length === 1 ? 'servizio' : 'servizi'} · da{' '}
                  {minPrice(group.items)}
                </span>
                <span className="menu-panel-subtitle">{group.subtitle}</span>
              </span>
              <ChevronDown className="menu-panel-chevron" size={22} strokeWidth={2} aria-hidden />
            </button>

            <div
              id={`panel-${group.category}`}
              className="menu-panel-content"
              role="region"
              aria-label={group.label}
            >
              <div className="menu-panel-inner">
                {group.category === 'baby' && (
                  <p className="menu-panel-note">{BABY_NOTE}</p>
                )}

                <ul className="menu-service-list">
                  {group.items.map((service, index) => (
                    <li key={service.id} className="menu-service-item">
                      <div className="menu-service-info">
                        <span className="menu-service-index">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <div>
                          <p className="menu-service-name">{service.name}</p>
                          <span className="menu-service-duration">
                            {formatDuration(service.duration_minutes)}
                          </span>
                        </div>
                      </div>
                      <div className="menu-service-actions">
                        <span className="menu-service-price">{formatPrice(service.price_cents)}</span>
                        <Link href="/prenota" className="menu-service-book">
                          Prenota
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}