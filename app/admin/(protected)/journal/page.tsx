import { AdminJournalManager } from '@/components/admin/AdminJournalManager';
import { getAdminArticlesAction } from '@/lib/actions/journal-admin';

export const metadata = { title: 'Journal' };
export const dynamic = 'force-dynamic';

export default async function AdminJournalPage() {
  const articles = await getAdminArticlesAction();
  return <AdminJournalManager articles={articles} />;
}
