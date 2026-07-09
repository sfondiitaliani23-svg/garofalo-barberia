import Link from 'next/link';
import { Tag } from 'lucide-react';
import { formatDiscountLabel } from '@/lib/utils/promotions';
import { formatPrice } from '@/lib/utils';
import type { Promotion } from '@/types/database';
import './active-promotions.css';

interface ActivePromotionsProps {
  promotions: Promotion[];
}

export function ActivePromotions({ promotions }: ActivePromotionsProps) {
  if (promotions.length === 0) return null;

  return (
    <div className="active-promotions">
      <div className="active-promotions-header">
        <Tag size={18} className="text-gold" />
        <h2 className="active-promotions-title">Promozioni attive</h2>
      </div>
      <div className="active-promotions-grid">
        {promotions.map((promo) => (
          <article key={promo.id} className="promo-card">
            <div className="promo-card-badge">
              {formatDiscountLabel(promo.discount_type, promo.discount_value)}
            </div>
            <h3 className="promo-card-title">{promo.title}</h3>
            {promo.description && (
              <p className="promo-card-desc">{promo.description}</p>
            )}
            <p className="promo-card-meta">
              {promo.service?.name ? promo.service.name : 'Tutti i servizi'}
              {promo.code && (
                <span className="promo-card-code">
                  Codice: <strong>{promo.code}</strong>
                </span>
              )}
            </p>
            {promo.service && promo.discount_type === 'fixed' && (
              <p className="promo-card-saving">
                Risparmi {formatPrice(promo.discount_value)} su {promo.service.name}
              </p>
            )}
          </article>
        ))}
      </div>
      <p className="active-promotions-cta">
        {promotions.some((p) => p.code) ? (
          <>
            Hai un codice? Inseriscilo durante la{' '}
            <Link href="/prenota" className="promo-link">prenotazione online</Link>.
          </>
        ) : (
          <>
            Lo sconto si applica automaticamente in{' '}
            <Link href="/prenota" className="promo-link">prenotazione</Link>.
          </>
        )}
      </p>
    </div>
  );
}