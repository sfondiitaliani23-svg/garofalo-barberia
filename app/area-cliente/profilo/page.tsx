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

      <h1 className="font-display text-3xl uppercase">{L(lang, 'Profilo', 'Profile')}</h1>
      <p className="mt-1 text-white/50">{L(lang, 'I tuoi dati e preferenze', 'Your details and preferences')}</p>
      
      <ProfileForm profile={profile} />
      <PasskeyManager />
      <PushManager />
    </div>
  );
}