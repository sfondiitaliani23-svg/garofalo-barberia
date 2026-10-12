import { getAdminPromotions } from '@/lib/actions/admin';
import { AdminPromotionsManager } from '@/components/admin/AdminPromotionsManager';

export const metadata = { title: 'Promozioni Admin' };

export default async function AdminPromozioniPage() {
  const { promotions, services } = await getAdminPromotions();

  return (
    <div>
      <AdminPromotionsManager promotions={promotions} services={services} />
    </div>
  );
}