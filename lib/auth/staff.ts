import type { UserRole } from '@/types/database';

/** Chi entra nell'area riservata. Il cliente resta fuori. */
export function isStaffRole(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'dipendente' || role === 'tester';
}

/** Admin e dipendente modificano. Il tester guarda soltanto. */
export function canMutate(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'dipendente';
}

/** Incassi e profitti: solo l'admin. */
export function canSeeFinance(role: string | null | undefined): boolean {
  return role === 'admin';
}

/** Promuovere o riportare un iscritto a cliente: solo l'admin. */
export function canAssignRoles(role: string | null | undefined): boolean {
  return role === 'admin';
}

/** Il tester propone novità e non le applica. */
export function canPropose(role: string | null | undefined): boolean {
  return role === 'tester';
}

export const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'customer', label: 'Cliente' },
  { value: 'dipendente', label: 'Dipendente' },
  { value: 'tester', label: 'Tester' },
  { value: 'admin', label: 'Admin' },
];

export function roleLabel(role: string | null | undefined): string {
  return ROLE_OPTIONS.find((item) => item.value === role)?.label ?? 'Cliente';
}
