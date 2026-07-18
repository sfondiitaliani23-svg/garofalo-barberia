import { Suspense } from 'react';
import { getProfile } from '@/lib/auth';
import { ProfileForm } from '@/components/customer/ProfileForm';
import { SavedToast } from '@/components/customer/SavedToast';

export const metadata = { title: 'Profilo' };

export default async function CustomerProfiloPage() {
  const profile = await getProfile();

  return (
    <div>
      {/* Toast di conferma salvataggio */}
      <Suspense fallback={null}>
        <SavedToast />
      </Suspense>

      <h1 className="font-display text-3xl uppercase">Profilo</h1>
      <p className="mt-1 text-white/50">I tuoi dati e preferenze</p>
      
      <ProfileForm profile={profile} />
    </div>
  );
}