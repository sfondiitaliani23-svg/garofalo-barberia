import { AdminCustomersList, NewCustomerBookingButton } from '@/components/admin/AdminCustomersList';
import { getCustomers, getCustomersActivity } from '@/lib/actions/admin';

export const metadata = { title: 'Clienti' };

export default async function AdminClientiPage() {
  const [customers, activity] = await Promise.all([getCustomers(), getCustomersActivity().catch(() => ({}))]);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl text-white" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
            Clienti
          </h1>
          <p className="mt-1 text-sm text-white/50">
            Elenco completo dei clienti registrati · {customers.length} {customers.length === 1 ? 'cliente' : 'clienti'}
          </p>
        </div>
        <NewCustomerBookingButton />
      </div>
      <div className="mt-6">
        <AdminCustomersList customers={customers} activity={activity} />
      </div>
    </div>
  );
}
