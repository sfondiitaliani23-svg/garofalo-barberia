import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AdminCustomerGalleryManager } from '@/components/admin/AdminCustomerGalleryManager';
import { getCustomerPhotos } from '@/lib/actions/customer-gallery';

export const metadata = { title: 'Gestione Galleria Cliente' };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminCustomerGalleryPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) notFound();

  // Recupera il profilo del cliente dal database
  const { data: customer } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (!customer) {
    notFound();
  }

  // Recupera le foto della galleria del cliente
  const photos = await getCustomerPhotos(id);

  return (
    <AdminCustomerGalleryManager customer={customer} initialPhotos={photos} />
  );
}
