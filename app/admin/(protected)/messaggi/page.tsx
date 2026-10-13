import { AdminInbox } from '@/components/admin/AdminInbox';
import { getInboxAction, getQrScanCountsAction } from '@/lib/actions/site-inbox';
import { getComebackStatsAction } from '@/lib/actions/comeback-admin';
import { getPushOverviewAction } from '@/lib/actions/push-admin';
import { SHOP_QRS } from '@/lib/data/qr';

export const metadata = { title: 'Messaggi e QR' };
export const dynamic = 'force-dynamic';

export default async function AdminMessaggiPage() {
  const [items, scans, comeback, push] = await Promise.all([getInboxAction(), getQrScanCountsAction(), getComebackStatsAction(), getPushOverviewAction()]);
  return <AdminInbox items={items} qrs={SHOP_QRS} scans={scans} comeback={comeback} push={push} />;
}
