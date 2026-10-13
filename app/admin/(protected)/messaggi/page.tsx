import { AdminInbox } from '@/components/admin/AdminInbox';
import { getInboxAction, getQrScanCountsAction } from '@/lib/actions/site-inbox';
import { SHOP_QRS } from '@/lib/data/qr';

export const metadata = { title: 'Messaggi e QR' };
export const dynamic = 'force-dynamic';

export default async function AdminMessaggiPage() {
  const [items, scans] = await Promise.all([getInboxAction(), getQrScanCountsAction()]);
  return <AdminInbox items={items} qrs={SHOP_QRS} scans={scans} />;
}
