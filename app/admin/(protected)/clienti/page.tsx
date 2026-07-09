import { getCustomers } from '@/lib/actions/admin';

export const metadata = { title: 'Clienti' };

export default async function AdminClientiPage() {
  const customers = await getCustomers();

  return (
    <div>
      <h1 className="font-display text-3xl uppercase">Clienti</h1>
      <p className="mt-1 text-white/50">{customers.length} clienti registrati</p>
      <div className="mt-8 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-white/50">
              <th className="pb-3 pr-4">Nome</th>
              <th className="pb-3 pr-4">Email</th>
              <th className="pb-3 pr-4">Telefono</th>
              <th className="pb-3">Registrato</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-b border-white/5">
                <td className="py-3 pr-4">{c.full_name || '—'}</td>
                <td className="py-3 pr-4">{c.email}</td>
                <td className="py-3 pr-4">{c.phone || '—'}</td>
                <td className="py-3">{new Date(c.created_at).toLocaleDateString('it-IT')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}