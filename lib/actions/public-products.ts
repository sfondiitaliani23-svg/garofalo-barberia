'use server';

import { createServiceClient } from '@/lib/supabase/server';
import type { ProductCategory } from '@/types/database';

export type PublicProduct = {
  id: string;
  name: string;
  brand: string | null;
  category: ProductCategory;
  price_cents: number | null;
  image_url: string | null;
  description: string | null;
  available: boolean;
};

/** Prodotti attivi per la vetrina pubblica: niente quantità di magazzino, solo "disponibile" sì/no. */
export async function getPublicProducts(): Promise<PublicProduct[]> {
  try {
    const supabase = await createServiceClient();
    if (!supabase) return [];
    const { data } = await supabase
      .from('products')
      .select('id, name, brand, category, price_cents, image_url, description, stock_quantity, sort_order')
      .eq('is_active', true)
      .order('sort_order')
      .order('name');
    return (data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      category: p.category,
      price_cents: p.price_cents,
      image_url: p.image_url,
      description: p.description,
      available: (p.stock_quantity ?? 0) > 0,
    }));
  } catch {
    return [];
  }
}
