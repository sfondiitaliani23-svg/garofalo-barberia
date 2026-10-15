import { AdminProtectedShell } from '@/components/layout/AdminProtectedShell';
import { getProfile } from '@/lib/auth';

export default async function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  const tester = profile?.role === 'tester';
  return (
    <>
      {tester && (
        <div role="status" className="sticky top-0 z-50 bg-amber-500 px-4 py-2 text-center text-sm font-semibold text-black print:hidden">
          Modalità tester: puoi guardare tutte le funzioni, ma non puoi modificare nulla e i dati dei clienti sono nascosti.
        </div>
      )}
      <AdminProtectedShell readOnly={tester}>{children}</AdminProtectedShell>
    </>
  );
}
