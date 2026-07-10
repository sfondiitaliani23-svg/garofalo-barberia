'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export type AdminSaveRegistration = {
  id: string;
  isDirty: boolean;
  isSaving: boolean;
  save: () => void | Promise<void>;
};

type AdminSaveContextValue = {
  register: (registration: AdminSaveRegistration) => void;
  unregister: (id: string) => void;
  registrations: AdminSaveRegistration[];
};

const AdminSaveContext = createContext<AdminSaveContextValue | null>(null);

export function AdminSaveProvider({ children }: { children: ReactNode }) {
  const [registrations, setRegistrations] = useState<AdminSaveRegistration[]>([]);

  const register = useCallback((registration: AdminSaveRegistration) => {
    setRegistrations((current) => {
      const index = current.findIndex((item) => item.id === registration.id);
      if (index === -1) return [...current, registration];

      const existing = current[index];
      if (
        existing.isDirty === registration.isDirty &&
        existing.isSaving === registration.isSaving &&
        existing.save === registration.save
      ) {
        return current;
      }

      const next = [...current];
      next[index] = registration;
      return next;
    });
  }, []);

  const unregister = useCallback((id: string) => {
    setRegistrations((current) => {
      if (!current.some((item) => item.id === id)) return current;
      return current.filter((item) => item.id !== id);
    });
  }, []);

  const value = useMemo(
    () => ({ register, unregister, registrations }),
    [register, unregister, registrations]
  );

  return <AdminSaveContext.Provider value={value}>{children}</AdminSaveContext.Provider>;
}

export function useAdminSaveRegistration(
  registration: Omit<AdminSaveRegistration, 'id'> | null
) {
  const context = useContext(AdminSaveContext);
  const id = useId();
  const saveRef = useRef(registration?.save);
  saveRef.current = registration?.save;

  const isActive = registration !== null;
  const isDirty = registration?.isDirty ?? false;
  const isSaving = registration?.isSaving ?? false;

  const stableSave = useCallback(() => {
    saveRef.current?.();
  }, []);

  useEffect(() => {
    if (!context) return;

    if (!isActive) {
      context.unregister(id);
      return;
    }

    context.register({
      id,
      isDirty,
      isSaving,
      save: stableSave,
    });

    return () => context.unregister(id);
  }, [context, id, isActive, isDirty, isSaving, stableSave]);
}

export function useAdminSaveState() {
  const context = useContext(AdminSaveContext);
  const registrations = context?.registrations ?? [];

  const dirtyRegistrations = registrations.filter((item) => item.isDirty);
  const isSaving = registrations.some((item) => item.isSaving);
  const isDirty = dirtyRegistrations.length > 0;

  async function saveAll() {
    for (const item of dirtyRegistrations) {
      await item.save();
    }
  }

  return { isDirty, isSaving, saveAll, hasRegistrations: registrations.length > 0 };
}