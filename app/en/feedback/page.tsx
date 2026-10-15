import FeedbackView from '@/app/(public)/feedback/view';
import { alternatesFor, OG_EN } from '@/lib/i18n/seo';

export const metadata = {
  title: 'Anonymous feedback',
  description: 'Tell us how your visit to Barberia Garofalo went. Anonymous feedback, no name or contact details.',
  alternates: alternatesFor('/feedback', 'en'),
  robots: { index: false, follow: true },
  openGraph: OG_EN,
};

export default function Page() {
  return <FeedbackView lang="en" />;
}
