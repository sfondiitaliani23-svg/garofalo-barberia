import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/auth';
import { CustomerGalleryViewer } from '@/components/layout/CustomerGalleryViewer';
import { getCustomerLang } from '../_lang';
import { L } from '@/lib/i18n';

export async function generateMetadata() {
  const lang = await getCustomerLang();
  return { title: L(lang, 'La mia galleria', 'My gallery') };
}

export default async function CustomerGalleriaPage() {
  const lang = await getCustomerLang();
  const profile = await getProfile();
  const supabase = await createClient();
  const photos = supabase ? (await supabase
    .from('customer_photos')
    .select('*')
    .eq('customer_id', profile?.id ?? '')
    .order('created_at', { ascending: false })).data ?? [] : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl uppercase text-gold">{L(lang, 'Galleria tagli', 'Haircut gallery')}</h1>
        <p className="mt-1 text-sm text-white/50">{L(lang, 'Foto dei tuoi tagli caricati dalla barberia', 'Photos of your haircuts, uploaded by the barbershop')}</p>
      </div>
      <div className="pt-2">
        <CustomerGalleryViewer photos={photos} />
      </div>
    </div>
  );
}