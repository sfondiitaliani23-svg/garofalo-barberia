'use server';

import { revalidatePath } from 'next/cache';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';

export async function getCustomerPhotos(customerId: string) {
  const supabase = await createServiceClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('customer_photos')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching customer photos:', error);
    return [];
  }
  return data || [];
}

type PhotoResult = { ok: true; photo: any } | { ok: false; error: string };

// L'admin è verificato con la sessione (requireAdmin); il database si scrive con il client di servizio.
// Gli errori tornano come messaggio leggibile: in produzione un errore lanciato da un'azione arriva al browser
// come un testo tecnico generico ("An error occurred in the Server Components render…").
export async function addCustomerPhoto(customerId: string, photoUrl: string, caption?: string): Promise<PhotoResult> {
  await requireAdmin();
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato.' };

  const { data, error } = await supabase
    .from('customer_photos')
    .insert({
      customer_id: customerId,
      photo_url: photoUrl,
      caption: caption || null,
    })
    .select()
    .single();

  if (error) return { ok: false, error: 'Non sono riuscito a salvare la foto. Riprova.' };

  revalidatePath(`/admin/clienti/${customerId}/galleria`);
  revalidatePath('/area-cliente/galleria');
  return { ok: true, photo: data };
}

export async function deleteCustomerPhoto(photoId: string, customerId: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato.' };

  const { error } = await supabase
    .from('customer_photos')
    .delete()
    .eq('id', photoId)
    .eq('customer_id', customerId);

  if (error) return { ok: false, error: 'Non sono riuscito a eliminare la foto. Riprova.' };

  revalidatePath(`/admin/clienti/${customerId}/galleria`);
  revalidatePath('/area-cliente/galleria');
  return { ok: true };
}

/** Aggiorna l'immagine di profilo di un cliente (indirizzo https o immagine caricata). */
export async function setCustomerAvatar(customerId: string, imageUrl: string): Promise<{ ok: boolean; error?: string; url?: string }> {
  await requireAdmin();
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato.' };

  const url = imageUrl.trim();
  if (!/^https:\/\/\S+$/i.test(url) && !/^data:image\/(jpeg|png|webp);base64,/i.test(url)) {
    return { ok: false, error: "Inserisci un indirizzo che inizia con https:// oppure carica un'immagine." };
  }
  if (url.length > 600_000) return { ok: false, error: "L'immagine è troppo pesante." };

  const { data: target } = await supabase.from('profiles').select('id, role').eq('id', customerId).maybeSingle();
  if (!target) return { ok: false, error: 'Cliente non trovato.' };
  if (target.role !== 'customer') return { ok: false, error: 'Puoi modificare solo i clienti.' };

  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: url, updated_at: new Date().toISOString() })
    .eq('id', customerId);
  if (error) return { ok: false, error: "Non sono riuscito ad aggiornare l'immagine. Riprova." };

  revalidatePath('/admin/clienti');
  revalidatePath(`/admin/clienti/${customerId}/galleria`);
  revalidatePath('/area-cliente/dashboard');
  revalidatePath('/area-cliente/profilo');
  return { ok: true, url };
}
