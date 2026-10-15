import { PublicShell } from '@/components/layout/PublicShell';
import './public-pages.css';

export const revalidate = 60;

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  return <PublicShell lang="it">{children}</PublicShell>;
}
