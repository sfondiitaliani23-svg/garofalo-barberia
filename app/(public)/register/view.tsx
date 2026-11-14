import LoginView from '@/app/(public)/login/view';
import type { Lang } from '@/lib/i18n';

// 14/11/2026: Registrati usa la stessa scheda doppia di Accedi (components/auth/AuthStage.tsx), già girata.
export default function RegisterView({ lang = 'it' }: { lang?: Lang } = {}) {
  return <LoginView lang={lang} modo="register" />;
}
