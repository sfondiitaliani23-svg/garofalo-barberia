import { PageHeader } from '@/components/customer/PageHeader';
import { Suspense } from 'react';
import { getProfile } from '@/lib/auth';
import { ProfileForm } from '@/components/customer/ProfileForm';
import { SavedToast } from '@/components/customer/SavedToast';
import { PasskeyManager } from '@/components/customer/PasskeyManager';
import { PushManager } from '@/components/customer/PushManager';
import { getCustomerLang } from '../_lang';
import { L } from '@/lib/i18n';

export async function generateMetadata() {
  const lang = await getCustomerLang();
  return { title: L(lang, 'Profilo', 'Profile') };
}

export default async function CustomerProfiloPage() {
  const lang = await getCustomerLang();
  const profile = await getProfile();

  return (
    <div>
      {/* Toast di conferma salvataggio */}
      <Suspense fallback={null}>
        <SavedToast />
      </Suspense>

      <PageHeader eyebrow={L(lang, 'Il tuo account', 'Your account')} title={L(lang, 'Profilo', 'Profile')} subtitle={L(lang, 'I tuoi dati e preferenze', 'Your details and preferences')} />

      <ProfileForm profile={profile} />
      <PasskeyManager />
      <PushManager />
    </div>
  );
}