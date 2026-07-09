import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/auth';

export const metadata = { title: 'La mia galleria' };

export default async function CustomerGalleriaPage() {
  const profile = await getProfile();
  const supabase = await createClient();
  const photos = supabase ? (await supabase
    .from('appointment_photos')
    .select('*')
    .eq('customer_id', profile?.id ?? '')
    .order('created_at', { ascending: false })).data ?? [] : [];

  return (
    <div>
      <h1 className="font-display text-3xl uppercase">Galleria tagli</h1>
      <p className="mt-1 text-white/50">Foto dei tuoi tagli caricati dalla barberia</p>
      {photos.length === 0 ? (
        <p className="mt-8 text-white/50">Nessuna foto ancora. Dopo il tuo prossimo taglio appariranno qui.</p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo) => (
            <div key={photo.id} className="rounded-lg border border-white/10 bg-[#111] p-3">
              <p className="text-xs uppercase text-gold">{photo.photo_type}</p>
              <p className="text-sm text-white/60 mt-1">{photo.caption || photo.storage_path}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}