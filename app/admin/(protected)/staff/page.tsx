import { AdminTeamManager } from '@/components/admin/AdminTeamManager';
import { getAdminTeamData } from '@/lib/actions/admin';

export const metadata = { title: 'Gestione team' };

export default async function AdminStaffPage() {
  const { barbers, availability, timeOff } = await getAdminTeamData();

  return (
    <AdminTeamManager barbers={barbers} availability={availability} timeOff={timeOff} />
  );
}