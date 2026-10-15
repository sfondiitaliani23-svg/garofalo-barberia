import { getProfile } from '@/lib/auth';
import { getIssueReports } from '@/lib/actions/issue-reports';
import { IssueReportWizard } from '@/components/admin/IssueReportWizard';

export const metadata = {
  title: 'Segnalaci il problema | Admin Barberia Garofalo',
  description: 'Invia una segnalazione sul sito: viene salvata e gestita dallo sviluppatore.',
};

export default async function AdminSegnalazioniPage() {
  const initialReports = await getIssueReports();
  const me = await getProfile();
  return <IssueReportWizard initialReports={initialReports} readOnly={me?.role === 'tester'} />;
}
