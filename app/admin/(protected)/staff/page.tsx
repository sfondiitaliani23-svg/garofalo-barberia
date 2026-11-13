import { AdminTeamManager } from '@/components/admin/AdminTeamManager';
import { UnlockedDaysCard } from '@/components/admin/UnlockedDaysCard';
import { getAdminTeamData } from '@/lib/actions/admin';
import { readUnlockedDays } from '@/lib/unlocked-days-server';

export const metadata = { title: 'Gestione team' };

export default async function AdminStaffPage() {
  const [{ barbers, availability, timeOff }, unlockedDays] = await Promise.all([getAdminTeamData(), readUnlockedDays()]);

  return (
    <div className="space-y-8">
      <AdminTeamManager barbers={barbers} availability={availability} timeOff={timeOff} />
      <UnlockedDaysCard initialDays={unlockedDays} />
    </div>
  );
}
