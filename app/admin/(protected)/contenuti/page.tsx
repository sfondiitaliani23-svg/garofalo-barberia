import { getAdminSiteContent } from '@/lib/actions/admin';
import { AdminContentManager } from '@/components/admin/AdminContentManager';

export const metadata = { title: 'Contenuti' };

export default async function AdminContenutiPage() {
  const contents = await getAdminSiteContent();

  return (
    <div>
      <h1 className="font-display text-3xl uppercase">Contenuti</h1>
      <p className="mt-1 text-white/50">Banner chiusura e annunci visibili sul sito</p>
      <div className="mt-8">
        <AdminContentManager contents={contents} />
      </div>
    </div>
  );
}