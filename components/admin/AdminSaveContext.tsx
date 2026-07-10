'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

export type AdminSaveRegistration = {
  id: string;
  isDirty: boolean;
  isSaving: boolean;
  save: () => void | Promise<void>;
};

type AdminSaveActions = {
  register: (registration: AdminSaveRegistration) => void;
  unregister: (id: string) => void;
  saveAll: () => Promise<void>;
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => { isDirty: boolean; isSaving: boolean };
};

const AdminSaveActionsContext = createContext<AdminSaveActions | null>(null);

function buildSnapshot(registrations: AdminSaveRegistration[]) {
  return {
    isDirty: registrations.some((item) => item.isDirty),
    isSaving: registrations.some((item) => item.isSaving),
  };
}

export function AdminSaveProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef({
    registrations: [] as AdminSaveRegistration[],
    listeners: new Set<() => void>(),
    snapshot: { isDirty: false, isSaving: false },
  });

  const notify = useCallback(() => {
    for (const listener of storeRef.current.listeners) {
      listener();
    }
  }, []);

  const register = useCallback(
    (registration: AdminSaveRegistration) => {
      const store = storeRef.current;
      const index = store.registrations.findIndex((item) => item.id === registration.id);

      if (index === -1) {
        store.registrations = [...store.registrations, registration];
      } else {
        const existing = store.registrations[index];
        if (
          existing.isDirty === registration.isDirty &&
          existing.isSaving === registration.isSaving &&
          existing.save === registration.save
        ) {
          return;
        }
        const next = [...store.registrations];
        next[index] = registration;
        store.registrations = next;
      }

      const nextSnapshot = buildSnapshot(store.registrations);
      if (
        nextSnapshot.isDirty !== store.snapshot.isDirty ||
        nextSnapshot.isSaving !== store.snapshot.isSaving
      ) {
        store.snapshot = nextSnapshot;
        notify();
      }
    },
    [notify]
  );

  const unregister = useCallback(
    (id: string) => {
      const store = storeRef.current;
      if (!store.registrations.some((item) => item.id === id)) return;

      store.registrations = store.registrations.filter((item) => item.id !== id);
      const nextSnapshot = buildSnapshot(store.registrations);
      if (
        nextSnapshot.isDirty !== store.snapshot.isDirty ||
        nextSnapshot.isSaving !== store.snapshot.isSaving
      ) {
        store.snapshot = nextSnapshot;
        notify();
      }
    },
    [notify]
  );

  const saveAll = useCallback(async () => {
    for (const item of storeRef.current.registrations.filter((entry) => entry.isDirty)) {
      await item.save();
    }
  }, []);

  const subscribe = useCallback((listener: () => void) => {
    storeRef.current.listeners.add(listener);
    return () => {
      storeRef.current.listeners.delete(listener);
    };
  }, []);

  const getSnapshot = useCallback(() => storeRef.current.snapshot, []);

  const actions = useRef({
    register,
    unregister,
    saveAll,
    subscribe,
    getSnapshot,
  });

  actions.current = { register, unregister, saveAll, subscribe, getSnapshot };

  return (
    <AdminSaveActionsContext.Provider value={actions.current}>
      {children}
    </AdminSaveActionsContext.Provider>
  );
}

export function useAdminSaveRegistration(
  registration: Omit<AdminSaveRegistration, 'id'> | null
) {
  const context = useContext(AdminSaveActionsContext);
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
  const context = useContext(AdminSaveActionsContext);
  if (!context) {
    return { isDirty: false, isSaving: false, saveAll: async () => {}, hasRegistrations: false };
  }

  const snapshot = useSyncExternalStore(context.subscribe, context.getSnapshot, context.getSnapshot);

  return {
    isDirty: snapshot.isDirty,
    isSaving: snapshot.isSaving,
    saveAll: context.saveAll,
    hasRegistrations: snapshot.isDirty || snapshot.isSaving,
  };
}