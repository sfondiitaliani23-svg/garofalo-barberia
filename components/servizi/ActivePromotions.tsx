import { LocLink as Link } from '@/components/i18n/LocLink';
import { Tag } from 'lucide-react';
import { formatDiscountLabel } from '@/lib/utils/promotions';
import { formatPrice } from '@/lib/utils';
import { L, type Lang } from '@/lib/i18n';
import { serviceName } from '@/lib/i18n/content-en';
import type { Promotion } from '@/types/database';
import './active-promotions.css';

interface ActivePromotionsProps {
  promotions: Promotion[];
  lang?: Lang;
}

export function ActivePromotions({ promotions, lang = 'it' }: ActivePromotionsProps) {
  if (promotions.length === 0) return null;

  return (
    <div className="active-promotions">
      <div className="active-promotions-header">
        <Tag size={18} className="text-gold" />
        <h2 className="active-promotions-title">{L(lang, 'Promozioni attive', 'Current promotions')}</h2>
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
              {promo.service?.name ? serviceName(lang, promo.service.name) : L(lang, 'Tutti i servizi', 'All services')}
              {promo.code && (
                <span className="promo-card-code">
                  {L(lang, 'Codice:', 'Code:')} <strong>{promo.code}</strong>
                </span>
              )}
            </p>
            {promo.service && promo.discount_type === 'fixed' && (
              <p className="promo-card-saving">
                {L(lang, 'Risparmi', 'You save')} {formatPrice(promo.discount_value)} {L(lang, 'su', 'on')} {serviceName(lang, promo.service.name)}
              </p>
            )}
          </article>
        ))}
      </div>
      <p className="active-promotions-cta">
        {promotions.some((p) => p.code) ? (
          <>
            {lang === 'en' ? (
              <>
                Have a code? Enter it during{' '}
                <Link href="/prenota" className="promo-link">online booking</Link>.
              </>
            ) : (
              <>
                Hai un codice? Inseriscilo durante la{' '}
                <Link href="/prenota" className="promo-link">prenotazione online</Link>.
              </>
            )}
          </>
        ) : (
          <>
            {lang === 'en' ? (
              <>
                The discount is applied automatically when you{' '}
                <Link href="/prenota" className="promo-link">book</Link>.
              </>
            ) : (
              <>
                Lo sconto si applica automaticamente in{' '}
                <Link href="/prenota" className="promo-link">prenotazione</Link>.
              </>
            )}
          </>
        )}
      </p>
    </div>
  );
}