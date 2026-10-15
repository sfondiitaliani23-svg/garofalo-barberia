import ChiSiamoView from './view';
import { alternatesFor } from '@/lib/i18n/seo';

export const metadata = {
  title: 'Chi siamo',
  description: "Chi siamo: la Barberia Garofalo a Foggia, un salone per uomo, ragazzo e bimbo. Il team, i valori e il modo di lavorare.",
  alternates: alternatesFor('/chi-siamo', 'it'),
};
export const revalidate = 300;

export default function Page() {
  return <ChiSiamoView lang="it" />;
}
