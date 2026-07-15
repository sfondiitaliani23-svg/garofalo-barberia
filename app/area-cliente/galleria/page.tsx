import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/auth';
import { CustomerGalleryViewer } from '@/components/layout/CustomerGalleryViewer';

export const metadata = { title: 'La mia galleria' };

export default async function CustomerGalleriaPage() {
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
        <h1 className="font-display text-3xl uppercase text-gold">Galleria tagli</h1>
        <p className="mt-1 text-sm text-white/50">Foto dei tuoi tagli caricati dalla barberia</p>
      </div>
      <div className="pt-2">
        <CustomerGalleryViewer photos={photos} />
      </div>
    </div>
  );
}