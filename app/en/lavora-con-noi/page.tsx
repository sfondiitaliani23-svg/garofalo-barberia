import type { Metadata } from 'next';
import { alternatesFor, OG_EN } from '@/lib/i18n/seo';
import LavoraConNoiView from '@/app/(public)/lavora-con-noi/view';

export const metadata: Metadata = {
  title: 'Work with us',
  description: 'Are you a barber, or do you want to learn the trade in Foggia? Send your application to Barberia Garofalo.',
  alternates: alternatesFor('/lavora-con-noi', 'en'),
  openGraph: OG_EN,
};

export default function Page() {
  return <LavoraConNoiView lang="en" />;
}
