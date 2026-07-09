import { AdminCustomersList } from '@/components/admin/AdminCustomersList';
import { getCustomers } from '@/lib/actions/admin';

export const metadata = { title: 'Clienti' };

export default async function AdminClientiPage() {
  const customers = await getCustomers();

  return (
    <div>
      <h1 className="font-display text-3xl uppercase">Clienti</h1>
      <p className="mt-1 text-white/50">Gestisci e trova rapidamente i clienti registrati</p>
      <div className="mt-8">
        <AdminCustomersList customers={customers} />
      </div>
    </div>
  );
}