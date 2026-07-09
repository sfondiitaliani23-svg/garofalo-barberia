import { getAdminServices } from '@/lib/actions/admin';
import { AdminServicesManager } from '@/components/admin/AdminServicesManager';

export const metadata = { title: 'Servizi Admin' };

export default async function AdminServiziPage() {
  const services = await getAdminServices();

  return (
    <div>
      <h1 className="font-display text-3xl uppercase">Servizi e prezzi</h1>
      <div className="mt-8">
        <AdminServicesManager services={services} />
      </div>
    </div>
  );
}