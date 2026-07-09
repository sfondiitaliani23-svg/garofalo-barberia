'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { Profile } from '@/types/database';

interface AdminCustomersListProps {
  customers: Profile[];
}

function normalize(value: string | null | undefined) {
  return (value ?? '').toLowerCase().trim();
}

function matchesQuery(customer: Profile, query: string) {
  if (!query) return true;

  const haystack = [
    customer.full_name,
    customer.email,
    customer.phone,
    customer.hair_preferences,
    customer.personal_notes,
  ]
    .map(normalize)
    .join(' ');

  return haystack.includes(query);
}

export function AdminCustomersList({ customers }: AdminCustomersListProps) {
  const [search, setSearch] = useState('');

  const query = normalize(search);
  const filtered = useMemo(
    () => customers.filter((customer) => matchesQuery(customer, query)),
    [customers, query]
  );

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-xl uppercase text-gold">Lista clienti</h2>
          <p className="mt-1 text-sm text-white/50">
            {query
              ? `${filtered.length} di ${customers.length} clienti`
              : `${customers.length} clienti registrati`}
          </p>
        </div>

        <div className="relative w-full sm:max-w-sm">
          <Search
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
            aria-hidden
          />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca per nome, email o telefono..."
            className="pl-10"
            aria-label="Cerca cliente"
          />
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-[#111] text-left text-white/50">
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Telefono</th>
              <th className="px-4 py-3 font-medium">Registrato</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-white/45">
                  {query
                    ? 'Nessun cliente corrisponde alla ricerca.'
                    : 'Nessun cliente registrato.'}
                </td>
              </tr>
            ) : (
              filtered.map((customer) => (
                <tr
                  key={customer.id}
                  className="border-b border-white/5 transition hover:bg-white/[0.03]"
                >
                  <td className="px-4 py-3 font-medium text-white">
                    {customer.full_name || '—'}
                  </td>
                  <td className="px-4 py-3 text-white/80">{customer.email || '—'}</td>
                  <td className="px-4 py-3 text-white/80">{customer.phone || '—'}</td>
                  <td className="px-4 py-3 text-white/60">
                    {new Date(customer.created_at).toLocaleDateString('it-IT', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}