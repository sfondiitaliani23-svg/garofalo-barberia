import { getAdminServices } from '@/lib/actions/admin';
import { AdminServicesManager } from '@/components/admin/AdminServicesManager';

export const metadata = { title: 'Servizi Admin' };

export default async function AdminServiziPage() {
  const services = await getAdminServices();

  return (
    <div>
      <AdminServicesManager services={services} />
    </div>
  );
}