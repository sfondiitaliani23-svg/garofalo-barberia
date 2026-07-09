import { getAdminPromotions } from '@/lib/actions/admin';
import { AdminPromotionsManager } from '@/components/admin/AdminPromotionsManager';

export const metadata = { title: 'Promozioni Admin' };

export default async function AdminPromozioniPage() {
  const { promotions, services } = await getAdminPromotions();

  return (
    <div>
      <h1 className="font-display text-3xl uppercase">Promozioni e sconti</h1>
      <div className="mt-8">
        <AdminPromotionsManager promotions={promotions} services={services} />
      </div>
    </div>
  );
}