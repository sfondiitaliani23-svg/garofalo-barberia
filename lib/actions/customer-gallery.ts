'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function getCustomerPhotos(customerId: string) {
  const supabase = await createClient();
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

export async function addCustomerPhoto(customerId: string, photoUrl: string, caption?: string) {
  const supabase = await createClient();
  if (!supabase) throw new Error('Database non configurato');

  // Verifica che l'utente connesso sia admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non autorizzato');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    throw new Error('Solo gli amministratori possono aggiungere foto alla galleria.');
  }

  const { data, error } = await supabase
    .from('customer_photos')
    .insert({
      customer_id: customerId,
      photo_url: photoUrl,
      caption: caption || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/admin/clienti/${customerId}/galleria`);
  revalidatePath('/area-cliente/galleria');
  return data;
}

export async function deleteCustomerPhoto(photoId: string, customerId: string) {
  const supabase = await createClient();
  if (!supabase) throw new Error('Database non configurato');

  // Verifica che l'utente connesso sia admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non autorizzato');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    throw new Error('Solo gli amministratori possono eliminare foto dalla galleria.');
  }

  const { error } = await supabase
    .from('customer_photos')
    .delete()
    .eq('id', photoId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/admin/clienti/${customerId}/galleria`);
  revalidatePath('/area-cliente/galleria');
  return { success: true };
}
