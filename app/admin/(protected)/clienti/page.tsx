import { AdminCustomersList } from '@/components/admin/AdminCustomersList';
import { getProfile } from '@/lib/auth';
import { getCustomers, getCustomersActivity } from '@/lib/actions/admin';
import { getPresenceAction } from '@/lib/actions/presence-admin';

export const metadata = { title: 'Clienti' };

export default async function AdminClientiPage() {
  const [customers, activity, presence, me] = await Promise.all([getCustomers(), getCustomersActivity().catch(() => ({})), getPresenceAction(), getProfile()]);
  const readOnly = me?.role === 'tester';

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl text-white" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
            Clienti
          </h1>
          <p className="mt-1 text-sm text-white/50">
            Iscritti al sito. Un admin può assegnare il ruolo Admin, Dipendente o Tester. · {customers.length} {customers.length === 1 ? 'iscritto' : 'iscritti'}
          </p>
        </div>
      </div>
      <div className="mt-6">
        <AdminCustomersList customers={customers} activity={activity} presence={presence} readOnly={readOnly} canAssignRoles={me?.role === 'admin'} />
      </div>
    </div>
  );
}
