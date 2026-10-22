'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setUserRole } from '@/lib/actions/roles';
import { ROLE_OPTIONS, roleLabel } from '@/lib/auth/staff';
import type { UserRole } from '@/types/database';

export function UserRoleSelect({
  userId,
  role,
  disabled,
}: {
  userId: string;
  role: UserRole;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState<UserRole>(role);
  const [error, setError] = useState('');
  const [pending, start] = useTransition();

  if (disabled) {
    return (
      <span className="inline-flex rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[11px] font-semibold text-white/70">
        {roleLabel(role)}
      </span>
    );
  }

  return (
    <label className="block min-w-[9.5rem]">
      <span className="sr-only">Ruolo</span>
      <select
        value={value}
        disabled={pending}
        onChange={(event) => {
          const next = event.target.value as UserRole;
          const previous = value;
          setValue(next);
          setError('');
          start(async () => {
            const result = await setUserRole(userId, next);
            if (!result.ok) {
              setValue(previous);
              setError(result.error || 'Salvataggio non riuscito.');
              return;
            }
            router.refresh();
          });
        }}
        className="w-full rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-xs text-white outline-none focus:border-gold disabled:opacity-60"
      >
        {ROLE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <span className="mt-1 block text-[11px] text-red-300">{error}</span>}
    </label>
  );
}
