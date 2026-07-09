import { AdminTeamManager } from '@/components/admin/AdminTeamManager';
import { getAdminTeamData } from '@/lib/actions/admin';

export const metadata = { title: 'Gestione team' };

export default async function AdminStaffPage() {
  const { barbers, availability, timeOff } = await getAdminTeamData();

  return (
    <div>
      <h1 className="font-display text-3xl uppercase">Gestione team</h1>
      <p className="mt-1 text-white/50">
        Barbieri, orari settimanali e ferie — le modifiche aggiornano subito le prenotazioni online
      </p>
      <div className="mt-8">
        <AdminTeamManager barbers={barbers} availability={availability} timeOff={timeOff} />
      </div>
    </div>
  );
}