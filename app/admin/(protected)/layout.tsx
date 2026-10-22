import { AdminProtectedShell } from '@/components/layout/AdminProtectedShell';
import { getProfile } from '@/lib/auth';
import { roleLabel } from '@/lib/auth/staff';

export default async function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  const tester = profile?.role === 'tester';
  const dipendente = profile?.role === 'dipendente';
  return (
    <>
      {tester && (
        <div role="status" className="sticky top-0 z-50 bg-amber-500 px-4 py-2 text-center text-sm font-semibold text-black print:hidden">
          Modalità tester: vedi tutte le funzioni, non puoi modificarle e non vedi incassi e profitti. Puoi solo proporre una novità agli admin.
        </div>
      )}
      {dipendente && (
        <div role="status" className="sticky top-0 z-50 bg-gold px-4 py-2 text-center text-sm font-semibold text-black print:hidden">
          Modalità dipendente: gestisci il salone come un admin. Incassi e profitti restano visibili solo agli admin.
        </div>
      )}
      <AdminProtectedShell readOnly={tester} areaLabel={roleLabel(profile?.role)}>{children}</AdminProtectedShell>
    </>
  );
}
