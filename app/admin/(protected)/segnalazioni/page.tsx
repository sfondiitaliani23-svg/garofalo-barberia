import { getIssueReports } from '@/lib/actions/issue-reports';
import { AdminIssueReportsManager } from '@/components/admin/AdminIssueReportsManager';

export const metadata = {
  title: 'Segnalaci il problema | Admin Barberia Garofalo',
  description: 'Canale diretto per il titolare Luigi Garofalo e risoluzione automatica tramite Agenti IA autonomi.',
};

export default async function AdminSegnalazioniPage() {
  const initialReports = await getIssueReports();

  return <AdminIssueReportsManager initialReports={initialReports} />;
}
